// Wallet Gateway — адаптер для внутреннего кошелька Kozagogo
// Реализует интерфейс PaymentGateway

import PaymentGateway from '../payment-gateway.js'

export default class WalletGateway extends PaymentGateway {
  constructor(config, pool) {
    super(config)
    this.pool = pool
  }

  async createPayment({ order_id, amount, currency, user }) {
    if (!user) {
      throw new Error('[wallet] Авторизация обязательна для оплаты с кошелька')
    }

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Проверяем баланс
      const balanceRes = await client.query(
        'SELECT balance FROM wallet_balances WHERE user_id = $1 FOR UPDATE',
        [user.id]
      )

      if (balanceRes.rows.length === 0) {
        throw new Error('Кошелёк не найден')
      }

      const currentBalance = parseFloat(balanceRes.rows[0].balance)
      const debitAmount = parseFloat(amount)

      if (currentBalance < debitAmount) {
        throw new Error('Недостаточно средств на кошельке')
      }

      const newBalance = currentBalance - debitAmount

      // Списываем с кошелька
      await client.query(
        'UPDATE wallet_balances SET balance = $1, updated_at = now() WHERE user_id = $2',
        [newBalance, user.id]
      )

      // Записываем транзакцию
      const txRes = await client.query(
        `INSERT INTO wallet_transactions (user_id, order_id, type, amount, balance_before, balance_after, description)
         VALUES ($1, $2, 'debit', $3, $4, $5, $6) RETURNING id`,
        [user.id, order_id, debitAmount, currentBalance, newBalance, `Оплата заказа #${order_id}`]
      )

      await client.query('COMMIT')

      return {
        redirect_url: null, // без редиректа, оплачено сразу
        transaction_id: txRes.rows[0].id,
        status: 'succeeded'
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async processWebhook(req) {
    // Кошелёк не использует внешние webhook'и
    throw new Error('[wallet] webhook не поддерживается для внутреннего кошелька')
  }

  async refundPayment(transactionId, amount) {
    // Находим оригинальную транзакцию
    const txRes = await this.pool.query(
      'SELECT * FROM wallet_transactions WHERE id = $1 AND type = $2',
      [transactionId, 'debit']
    )

    if (txRes.rows.length === 0) {
      throw new Error(`Транзакция ${transactionId} не найдена`)
    }

    const originalTx = txRes.rows[0]
    const refundAmount = parseFloat(amount) || Math.abs(parseFloat(originalTx.amount))

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Получаем текущий баланс
      const balanceRes = await client.query(
        'SELECT balance FROM wallet_balances WHERE user_id = $1 FOR UPDATE',
        [originalTx.user_id]
      )

      const currentBalance = parseFloat(balanceRes.rows[0].balance)
      const newBalance = currentBalance + refundAmount

      // Возвращаем средства
      await client.query(
        'UPDATE wallet_balances SET balance = $1, updated_at = now() WHERE user_id = $2',
        [newBalance, originalTx.user_id]
      )

      // Записываем возвратную транзакцию
      const refundRes = await client.query(
        `INSERT INTO wallet_transactions (user_id, order_id, type, amount, balance_before, balance_after, description)
         VALUES ($1, $2, 'refund', $3, $4, $5, $6) RETURNING id`,
        [originalTx.user_id, originalTx.order_id, refundAmount, currentBalance, newBalance, `Возврат средств по заказу #${originalTx.order_id}`]
      )

      await client.query('COMMIT')

      return { status: 'succeeded', transaction_id: refundRes.rows[0].id }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}
