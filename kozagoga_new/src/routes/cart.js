// ─── Cart API Routes ──────────────────────────────────────
// (SRS Модуль 3 — Корзина)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import {
  getOrCreateCart,
  getFullCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  mergeCarts,
} from '../services/cart-service.js'

export default function createCartRouter() {
  const router = Router()

  // ─── GET /api/cart — текущая корзина ─────────────────
  router.get('/', async (req, res) => {
    try {
      const userId = req.user?.id
      const sessionId = req.cookies?.session_id || req.headers['x-session-id']

      if (!userId && !sessionId) {
        return res.json({ items: [], subtotal: 0, total: 0, currency: 'RUB' })
      }

      const cart = await getOrCreateCart(userId, sessionId)
      const fullCart = await getFullCart(cart.id)

      res.json(fullCart)
    } catch (err) {
      console.error('[cart] GET /api/cart error:', err)
      res.status(500).json({ error: 'Ошибка получения корзины' })
    }
  })

  // ─── POST /api/cart/items — добавить товар ──────────
  router.post('/items', async (req, res) => {
    try {
      const userId = req.user?.id
      const sessionId = req.cookies?.session_id || req.headers['x-session-id']
      const { product_id, variant_id, quantity, gift_to, gift_message } = req.body

      if (!product_id) {
        return res.status(400).json({ error: 'product_id обязателен' })
      }

      if (!userId && !sessionId) {
        return res.status(401).json({ error: 'Требуется авторизация или session_id' })
      }

      const cart = await getOrCreateCart(userId, sessionId)
      const item = await addCartItem(cart.id, product_id, {
        variantId: variant_id || null,
        quantity: quantity || 1,
        giftTo: gift_to || null,
        giftMessage: gift_message || null,
      })

      res.status(201).json(item)
    } catch (err) {
      console.error('[cart] POST /api/cart/items error:', err)
      if (err.message.includes('not found') || err.message.includes('inactive')) {
        return res.status(404).json({ error: err.message })
      }
      res.status(500).json({ error: 'Ошибка добавления в корзину' })
    }
  })

  // ─── PATCH /api/cart/items/:id — изменить количество ──
  router.patch('/items/:id', async (req, res) => {
    try {
      const { quantity } = req.body
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ error: 'quantity обязателен и >= 0' })
      }

      if (quantity === 0) {
        await removeCartItem(req.params.id)
        return res.json({ deleted: true })
      }

      const item = await updateCartItemQuantity(req.params.id, quantity)
      if (!item) {
        return res.status(404).json({ error: 'Товар не найден в корзине' })
      }

      res.json(item)
    } catch (err) {
      console.error('[cart] PATCH /api/cart/items/:id error:', err)
      res.status(500).json({ error: 'Ошибка обновления' })
    }
  })

  // ─── DELETE /api/cart/items/:id — удалить товар ─────
  router.delete('/items/:id', async (req, res) => {
    try {
      const item = await removeCartItem(req.params.id)
      if (!item) {
        return res.status(404).json({ error: 'Товар не найден в корзине' })
      }
      res.json({ deleted: true })
    } catch (err) {
      console.error('[cart] DELETE /api/cart/items/:id error:', err)
      res.status(500).json({ error: 'Ошибка удаления' })
    }
  })

  // ─── POST /api/cart/coupon — применить промокод ────
  router.post('/coupon', async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) return res.status(401).json({ error: 'Требуется авторизация' })

      const { code } = req.body
      if (!code) return res.status(400).json({ error: 'code обязателен' })

      const cart = await getOrCreateCart(userId)
      const result = await applyCoupon(cart.id, code, userId)

      res.json(result)
    } catch (err) {
      if (err.message.includes('не найден') || err.message.includes('истёк') || err.message.includes('лимит') || err.message.includes('Минимальная')) {
        return res.status(400).json({ error: err.message })
      }
      console.error('[cart] POST /api/cart/coupon error:', err)
      res.status(500).json({ error: 'Ошибка применения промокода' })
    }
  })

  // ─── DELETE /api/cart/coupon — удалить промокод ───
  router.delete('/coupon', async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) return res.status(401).json({ error: 'Требуется авторизация' })

      const cart = await getOrCreateCart(userId)
      await removeCoupon(cart.id)

      res.json({ deleted: true })
    } catch (err) {
      console.error('[cart] DELETE /api/cart/coupon error:', err)
      res.status(500).json({ error: 'Ошибка удаления промокода' })
    }
  })

  // ─── DELETE /api/cart/clear — очистить корзину ─────
  router.delete('/clear', async (req, res) => {
    try {
      const userId = req.user?.id
      const sessionId = req.cookies?.session_id || req.headers['x-session-id']

      if (!userId && !sessionId) {
        return res.status(401).json({ error: 'Требуется авторизация' })
      }

      const cart = await getOrCreateCart(userId, sessionId)
      await clearCart(cart.id)

      res.json({ cleared: true })
    } catch (err) {
      console.error('[cart] DELETE /api/cart/clear error:', err)
      res.status(500).json({ error: 'Ошибка очистки корзины' })
    }
  })

  return router
}
