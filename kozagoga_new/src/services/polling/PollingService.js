// ─── PollingService — опрос статуса у провайдера ───────
// FR-DELIVERY-05: активный polling (5 сек), фоновый (1 час), таймаут 24ч
// ─────────────────────────────────────────────────────────────

import { getPollingConfig } from '../../../lib/config-loader.js'

export default class PollingService {
  /**
   * @param {object} pool - pg pool
   * @param {object} paymentGateways - { code → gateway }
   * @param {object} alertService - экземпляр AlertService
   */
  constructor(pool, paymentGateways, alertService) {
    this.pool = pool
    this.paymentGateways = paymentGateways
    this.alertService = alertService
  }

  /**
   * Запускает polling для транзакции провайдера.
   * Сначала активный (5 сек × 24 попытки), затем фоновый (1 час × 24 часа).
   *
   * @param {string} orderId
   * @param {string} packageId - provider_transaction_id
   * @param {object} provider - экземпляр провайдера (с методом status())
   */
  start(orderId, packageId, provider) {
    const pollConfig = getPollingConfig()
    const maxAttempts = pollConfig.active_max_attempts || 24
    const activeInterval = (pollConfig.active_interval_sec || 5) * 1000

    console.log(`[PollingService] Активный polling: order=${orderId}, package=${packageId}, provider=${provider.code}`)

    this._activePolling(orderId, packageId, provider, maxAttempts, activeInterval)
  }

  // ─── Активный polling (5 сек, до 24 попыток) ─────────
  _activePolling(orderId, packageId, provider, maxAttempts, intervalMs) {
    let attempts = 0

    const timer = setInterval(async () => {
      attempts++

      try {
        const status = await provider.status(packageId)

        // Сохраняем статус в transactions
        await this.pool.query(
          `UPDATE transactions SET provider_status = $1, response_body = $2, updated_at = now()
           WHERE provider_transaction_id = $3 AND operation = 'payment'`,
          [status.provider_status, JSON.stringify(status), packageId]
        )

        if (status.provider_status === 'COMPLETE' || status.provider_status === 'REBOOKED') {
          clearInterval(timer)
          await this.pool.query(
            `UPDATE orders SET provider_status = $1, status = 'completed', updated_at = now() WHERE id = $2`,
            [status.provider_status, orderId]
          )
          console.log(`[PollingService] ✅ Заказ ${orderId} завершён (COMPLETE)`)
          return
        }

        if (['FAILURE', 'CANCELLED', 'UNEXPECTED_ERROR'].includes(status.provider_status)) {
          clearInterval(timer)
          await this._handleProviderError(orderId, packageId, status.provider_status, provider.code)
          return
        }

        // Исчерпаны активные попытки → фоновый polling
        if (attempts >= maxAttempts) {
          clearInterval(timer)
          console.log(`[PollingService] ⏰ Активный исчерпан, фоновый: package=${packageId}`)
          this._backgroundPolling(orderId, packageId, provider)
        }
      } catch (err) {
        console.error(`[PollingService] Ошибка active polling ${packageId}:`, err.message)
        if (attempts >= maxAttempts) {
          clearInterval(timer)
          this._backgroundPolling(orderId, packageId, provider)
        }
      }
    }, intervalMs)
  }

  // ─── Фоновый polling (1 час, до 24 часов) ────────────
  _backgroundPolling(orderId, packageId, provider) {
    const pollConfig = getPollingConfig()
    const backgroundInterval = (pollConfig.background_interval_hours || 1) * 3600000
    const maxBackgroundHours = pollConfig.background_max_hours || 24
    const startTime = Date.now()

    const timer = setInterval(async () => {
      const elapsedHours = (Date.now() - startTime) / 3600000

      if (elapsedHours >= maxBackgroundHours) {
        clearInterval(timer)
        console.log(`[PollingService] 🚨 Таймаут ${maxBackgroundHours}ч: package=${packageId}`)

        // FR-DELIVERY-08: алерт через AlertService
        if (this.alertService) {
          try {
            await this.alertService.createAlert('polling_timeout', {
              order_id: orderId,
              transaction_id: packageId,
              provider_code: provider.code,
              message: `Транзакция ${packageId} не получила финальный статус за ${maxBackgroundHours}ч`,
              priority: 'critical',
            })
          } catch (alertErr) {
            console.error('[PollingService] Alert error:', alertErr.message)
          }
        }
        return
      }

      try {
        const status = await provider.status(packageId)

        await this.pool.query(
          `UPDATE transactions SET provider_status = $1, response_body = $2, updated_at = now()
           WHERE provider_transaction_id = $3 AND operation = 'payment'`,
          [status.provider_status, JSON.stringify(status), packageId]
        )

        if (status.provider_status === 'COMPLETE' || status.provider_status === 'REBOOKED') {
          clearInterval(timer)
          await this.pool.query(
            `UPDATE orders SET provider_status = $1, status = 'completed', updated_at = now() WHERE id = $2`,
            [status.provider_status, orderId]
          )
          console.log(`[PollingService] ✅ (фон) Заказ ${orderId} завершён`)
          return
        }

        if (['FAILURE', 'CANCELLED', 'UNEXPECTED_ERROR'].includes(status.provider_status)) {
          clearInterval(timer)
          await this._handleProviderError(orderId, packageId, status.provider_status, provider.code)
        }
      } catch (err) {
        console.error(`[PollingService] (фон) Ошибка ${packageId}:`, err.message)
      }
    }, backgroundInterval)
  }

  // ─── Обработка ошибки провайдера + auto-refund ───────
  async _handleProviderError(orderId, packageId, providerStatus, providerCode) {
    console.log(`[PollingService] ❌ Ошибка провайдера: order=${orderId}, status=${providerStatus}`)

    // FR-DELIVERY-07, Уровень 2: auto-refund
    try {
      const { rows: payments } = await this.pool.query(
        'SELECT * FROM payments WHERE order_id = $1 AND status = $2 LIMIT 1',
        [orderId, 'paid']
      )

      if (payments.length > 0) {
        const payment = payments[0]
        const gateway = this.paymentGateways[payment.gateway]

        if (gateway?.refundPayment) {
          await gateway.refundPayment(payment.gateway_tx_id, null)
          await this.pool.query(
            `UPDATE payments SET status = 'refunded' WHERE id = $1`,
            [payment.id]
          )
          console.log(`[PollingService] 💰 Auto-refund выполнен: payment=${payment.id}`)
        }
      }
    } catch (refundErr) {
      console.error(`[PollingService] 💥 Ошибка auto-refund:`, refundErr.message)

      // FR-DELIVERY-08: алерт о неудавшемся refund
      if (this.alertService) {
        await this.alertService.createAlert('refund_failed', {
          order_id: orderId,
          transaction_id: packageId,
          provider_code: providerCode,
          message: `Auto-refund failed for order ${orderId}: ${refundErr.message}`,
          priority: 'critical',
        })
      }
    }

    // Обновляем статус заказа
    await this.pool.query(
      `UPDATE orders SET provider_status = $1, status = 'cancelled', payment_status = 'refunded', updated_at = now() WHERE id = $2`,
      [providerStatus, orderId]
    )

    // FR-DELIVERY-08: алерт о неудавшейся доставке
    if (this.alertService) {
      await this.alertService.createAlert('provider_payment_failed', {
        order_id: orderId,
        transaction_id: packageId,
        provider_code: providerCode,
        message: `Provider returned ${providerStatus} for order ${orderId}. Auto-refund done.`,
        priority: 'high',
      })
    }
  }
}
