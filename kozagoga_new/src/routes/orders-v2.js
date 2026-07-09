// ─── Orders v2 API — создание заказа с услугами ────────────
// POST /api/v1/orders
// GET  /api/v1/orders/:id
// POST /api/v1/price/calculate
// ─────────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'
import { calculatePrice, createOrder, getOrderDetail } from '../services/order/OrderService.js'
import { processOrder } from '../services/integration/IntegrationService.js'
import { resolveGateway } from '../../lib/gateways/index.js'

export default function createOrdersV2Router(paymentGateways) {
  const router = Router()
  const pool = getPool()

  // ─── POST /api/v1/price/calculate ──────────────────────
  router.post('/price/calculate', async (req, res) => {
    try {
      const result = await calculatePrice(req.body, pool)
      if (result.error) {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: result.message } })
      }
      res.json(result)
    } catch (err) {
      console.error('[orders-v2:price] Error:', err)
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера' } })
    }
  })

  // ─── POST /api/v1/orders ───────────────────────────────
  router.post('/', async (req, res) => {
    try {
      const userId = req.user?.id || req.body.user_id
      if (!userId) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Требуется авторизация' } })
      }

      const result = await createOrder(req.body, userId, pool)

      // Конфликт идемпотентности
      if (result.conflict) {
        return res.status(409).json({
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Заказ с таким idempotency_key уже существует',
            existing_order_id: result.order_id,
            existing_status: result.status,
          },
        })
      }

      // Ошибка валидации
      if (result.validationError) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Проверьте введённые данные',
            details: result.validationError,
          },
        })
      }

      const { order, items } = result

      // Создание платежа
      try {
        const gatewayName = req.body.payment_method || 'wallet'
        const gateway = resolveGateway(gatewayName)

        if (gateway) {
          const paymentResult = await gateway.createPayment({
            orderId: order.id,
            amount: parseFloat(order.total),
            currency: order.currency,
            description: `Заказ #${order.id.slice(0, 8)}`,
            returnUrl: req.body.redirect_url,
          })

          // Сохраняем gateway_payment_id
          if (paymentResult.paymentId) {
            await pool.query(
              'UPDATE orders SET payment_gateway = $1, gateway_payment_id = $2 WHERE id = $3',
              [gatewayName, paymentResult.paymentId, order.id]
            )
          }

          return res.status(201).json({
            order_id: order.id,
            status: order.status,
            total_amount: parseFloat(order.total),
            currency: order.currency,
            discount_amount: 0,
            payment: {
              method: gatewayName,
              gateway: `kozagoga_${gatewayName}`,
              redirect_url: paymentResult.redirectUrl || paymentResult.confirmationUrl,
              expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            },
            items: items.map(i => ({
              id: i.service_id, // временно
              product_name: i.product_name,
              service_name: i.service_name,
              region_name: i.region_name,
              amount: i.unit_price,
              quantity: i.quantity,
              total: i.total_price,
              inputs: i.inputs.map(inp => ({
                field_key: inp.field_key,
                label: inp.field_label,
                value_preview: inp.value.length > 3 ? inp.value.slice(0, 3) + '***' : '***',
              })),
            })),
            created_at: order.created_at,
          })
        }
      } catch (paymentErr) {
        console.error('[orders-v2:payment] Error:', paymentErr)
        return res.status(502).json({
          error: {
            code: 'PAYMENT_GATEWAY_ERROR',
            message: 'Платёжный шлюз временно недоступен. Попробуйте позже.',
            order_id: order.id,
            order_status: order.status,
          },
        })
      }

      // Если нет gateway — возвращаем заказ без редиректа
      res.status(201).json({
        order_id: order.id,
        status: order.status,
        total_amount: parseFloat(order.total),
        currency: order.currency,
        items: items.map(i => ({
          product_name: i.product_name,
          service_name: i.service_name,
          amount: i.unit_price,
          quantity: i.quantity,
        })),
        created_at: order.created_at,
      })
    } catch (err) {
      console.error('[orders-v2] Error:', err)
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера' } })
    }
  })

  // ─── GET /api/v1/orders/:id ────────────────────────────
  router.get('/:id', async (req, res) => {
    try {
      const order = await getOrderDetail(req.params.id, pool)
      if (!order) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Заказ не найден' } })
      }

      res.json({
        order_id: order.id,
        status: order.status,
        total_amount: parseFloat(order.total),
        currency: order.currency,
        paid_at: order.paid_at,
        items: (order.items || []).map(item => ({
          id: item.id,
          product_name: item.product_name,
          service_name: item.service_name,
          region_name: item.region_name,
          delivery_status: item.delivery_status,
          result_value: item.delivery_status === 'delivered' ? item.result_value : null,
          external_id: item.external_id,
          inputs: (item.inputs || []).filter(inp => inp?.field_key).map(inp => ({
            field_key: inp.field_key,
            label: inp.field_label,
            value_preview: inp.value ? inp.value.slice(0, 3) + '***' : '***',
          })),
        })),
      })
    } catch (err) {
      console.error('[orders-v2:get] Error:', err)
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера' } })
    }
  })

  // ─── POST /api/v1/webhooks/payment — платёжный webhook ──
  router.post('/webhooks/payment', async (req, res) => {
    try {
      const { order_id, payment_status, gateway } = req.body

      if (!order_id) {
        return res.status(400).json({ error: 'MISSING_ORDER_ID' })
      }

      if (payment_status === 'paid') {
        await pool.query(
          `UPDATE orders SET
            payment_status = 'paid',
            status = 'paid',
            paid_at = NOW(),
            gateway_status = 'paid',
            updated_at = NOW()
          WHERE id = $1`,
          [order_id]
        )

        // История статусов
        await pool.query(
          `INSERT INTO order_status_history (order_id, to_status, changed_by, reason)
           VALUES ($1, 'paid', 'system', 'Payment received via ${gateway || 'unknown'}')`,
          [order_id]
        )

        // Запуск интеграции (sync для MVP)
        try {
          await processOrder(order_id)
        } catch (processErr) {
          console.error(`[webhook] processOrder error for ${order_id}:`, processErr)
        }
      }

      res.json({ received: true })
    } catch (err) {
      console.error('[webhook:payment] Error:', err)
      res.status(500).json({ error: 'SERVER_ERROR' })
    }
  })

  return router
}
