// Kozagogo Backend API Server
// PostgreSQL + Express + JWT Auth + Integrations

import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pkg from 'pg'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const { Pool } = pkg

// ─── Конфигурация ────────────────────────────────────────
const PORT = process.env.API_PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('🚨 FATAL: JWT_SECRET не задан или слишком короткий (< 32 символов).')
  console.error('🚨 Установите сильный JWT_SECRET в .env и перезапустите сервер.')
  process.exit(1)
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kozagogo',
  user: process.env.DB_USER || 'kozagogo',
  password: process.env.DB_PASS || 'kozagogo_pass_2024',
})

// ─── Инициализация модулей интеграций ──────────────────
import { getConfig, getPollingConfig, getPaymentGatewayMapping, getRateLimits, getPaymentConfig } from './lib/config-loader.js'
import { initProviders, getProvider, listProviders } from './lib/providers/index.js'
import { initGateways, resolveGateway } from './lib/gateways/index.js'

// Платежные шлюзы (инициализация через фабрику)
const paymentGateways = initGateways(pool)

// Кэш сервисов (in-memory)
let servicesCache = []
let servicesCacheTime = 0

// ─── Express setup ────────────────────────────────────────
const app = express()
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}))
// Сохраняем rawBody для HMAC-верификации webhook'ов
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = buf.toString() } }))

// Базовые security headers (работает без helmet)
app.use(csrfProtection)

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '0')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Strict-Transport-Security включать только при HTTPS
  if (req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

// ─── Middleware ──────────────────────────────────────────

// Простая CSRF-защита для state-changing запросов
// Проверяем Origin/Referer (SameSite-политика без установки пакетов)
function csrfProtection(req, res, next) {
  // Только POST, PUT, DELETE, PATCH
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next()

  // Пропускаем webhook'и — они приходят от платёжных систем, а не от браузера
  if (req.path.startsWith('/api/payments/webhook')) return next()

  const origin = req.headers['origin']
  const referer = req.headers['referer']
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:4173']

  // Пропускаем API-to-API запросы (curl, Postman, серверные вызовы)
  if (!origin && !referer) return next()

  // Динамически добавляем текущий Host как разрешённый (работает для туннелей)
  const host = req.headers['host']
  const allAllowed = [...allowedOrigins]
  if (host) {
    // Туннель расшифровывает HTTPS, nginx видит HTTP — добавляем оба
    allAllowed.push(`https://${host}`, `http://${host}`)
  }

  if (origin) {
    const matches = allAllowed.some(allowed => origin.startsWith(allowed))
    if (!matches) {
      return res.status(403).json({ error: 'CSRF: Origin not allowed' })
    }
  } else if (referer) {
    const matches = allAllowed.some(allowed => referer.startsWith(allowed))
    if (!matches) {
      return res.status(403).json({ error: 'CSRF: Referer not allowed' })
    }
  }
  next()
}

// Rate limiting (simple in-memory with TTL cleanup)
const rateCounters = new Map()
const RATE_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 минут

// Периодическая очистка устаревших записей rate limiter
setInterval(() => {
  const now = Date.now()
  let expired = 0
  for (const [key, entry] of rateCounters.entries()) {
    if (now - entry.start > 60000) {
      rateCounters.delete(key)
      expired++
    }
  }
  if (expired > 0) {
    console.log(`[rate-limiter] Очищено ${expired} устаревших записей, всего: ${rateCounters.size}`)
  }
}, RATE_CLEANUP_INTERVAL)

function rateLimit(limitPerMin) {
  return (req, res, next) => {
    if (!limitPerMin) return next()
    const key = req.ip + ':' + req.path
    const now = Date.now()
    const window = 60000 // 1 min

    if (!rateCounters.has(key)) {
      rateCounters.set(key, { count: 1, start: now })
      return next()
    }

    const entry = rateCounters.get(key)
    if (now - entry.start > window) {
      rateCounters.set(key, { count: 1, start: now })
      return next()
    }

    entry.count++
    if (entry.count > limitPerMin) {
      return res.status(429).json({ error: 'Слишком много запросов' })
    }
    next()
  }
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null
    return next()
  }
  try {
    const token = authHeader.split(' ')[1]
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    req.user = null
    next()
  }
}
app.use(cookieParser())
app.use(authenticate)

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Не авторизован' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Недостаточно прав' })
    next()
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' })
  next()
}

// ─── Auth endpoints ───────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' })
    if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' })

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Пользователь с таким email уже существует' })

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, email, role, created_at`,
      [email, passwordHash]
    )
    const user = result.rows[0]

    // Создаём wallet
    await pool.query('INSERT INTO wallet_balances (user_id, balance) VALUES ($1, 0)', [user.id])

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

    res.json({ user, token })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Ошибка регистрации' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' })

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) return res.status(401).json({ error: 'Неверный email или пароль' })

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' })

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at },
      token,
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Ошибка входа' })
  }
})

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' })
  const result = await pool.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [req.user.id])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' })
  res.json(result.rows[0])
})

// ═══════════════════════════════════════════════════════════
// ИНТЕГРАЦИИ: ПРОВАЙДЕРЫ УСЛУГ
// ═══════════════════════════════════════════════════════════

// FR-06: GET /api/services — список сервисов от всех провайдеров
app.get('/api/services', async (req, res) => {
  try {
    const cfg = getConfig()
    const cacheTtl = (cfg.cache?.service_list_ttl_sec || 3600) * 1000

    // Проверка кэша
    if (servicesCache.length > 0 && Date.now() - servicesCacheTime < cacheTtl) {
      return res.json(servicesCache)
    }

    const allServices = []
    const providers = listProviders()
    let hasError = false

    for (const provider of providers) {
      try {
        const services = await provider.getServices()
        allServices.push(...services.map(s => ({ ...s, provider_code: provider.code })))
      } catch (err) {
        hasError = true
        console.error(`[${provider.code}] Ошибка получения сервисов:`, err.message)
      }
    }

    if (hasError && allServices.length === 0) {
      // Все провайдеры вернули ошибку — сбрасываем кэш, отдаём 503
      servicesCache = []
      servicesCacheTime = 0
      return res.status(503).json({ error: 'Все провайдеры временно недоступны', cached: false })
    }

    // Фикс max_length для Optima 3 (сервис 1039) — Hyperion отдаёт 10, реальный реквизит 16 символов
    for (const svc of allServices) {
      if (svc.id === '1039') {
        for (const field of svc.fields) {
          if (field.max_length === 10) field.max_length = 16
        }
      }
    }

    // Обновляем кэш только при успешном получении хотя бы одного провайдера
    if (allServices.length > 0) {
      servicesCache = allServices
      servicesCacheTime = Date.now()
    }

    res.json(allServices)
  } catch (err) {
    console.error('GET /api/services error:', err)
    res.status(500).json({ error: 'Ошибка получения списка сервисов' })
  }
})

// FR-07: POST /api/validate — валидация реквизита
app.post('/api/validate', rateLimit(getRateLimits().validate || 60), async (req, res) => {
  try {
    const { product_id, requisite, params } = req.body
    if (!product_id || !requisite) {
      return res.status(400).json({ error: 'product_id и requisite обязательны' })
    }

    // Получаем товар
    const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id])
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' })
    }

    const product = productRes.rows[0]
    if (!product.provider_code) {
      return res.status(400).json({ error: 'Товар не привязан к провайдеру' })
    }

    const provider = getProvider(product.provider_code)

    // Получаем поля услуги (из кэша или запрашиваем)
    let fields = []
    try {
      const services = await provider.getServices()
      const service = services.find(s => s.id === product.provider_service_id)
      fields = service?.fields || []
    } catch {
      // если провайдер недоступен — поля не загрузятся
    }

    const result = await provider.validate({
      requisite,
      params: params || {},
      fields,
      bearer: product.provider_service_id,
      serviceId: product.provider_service_id
    })

    // Сохраняем расширенную транзакцию валидации
    const providerLogs = provider.getLogs ? provider.getLogs() : []
    const lastLog = providerLogs[providerLogs.length - 1]
    if (lastLog) {
      await pool.query(
        `INSERT INTO transactions (provider_code, operation, url, http_method, request_body, request_headers, response_body, response_headers, duration_ms, status, provider_status, error, description)
         VALUES ($1, 'requisite_enquiry', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [product.provider_code,
         lastLog.url || null,
         lastLog.method || 'POST',
         JSON.stringify(lastLog.request_body || {}),
         JSON.stringify(lastLog.request_headers || {}),
         JSON.stringify(result),
         JSON.stringify(lastLog.response_headers || {}),
         lastLog.duration_ms || 0,
         result.possible ? 'success' : 'error',
         result.result || null,
         lastLog.error || null,
         result.details || null]
      )
    } else {
      // fallback на старый формат
      await pool.query(
        `INSERT INTO transactions (provider_code, operation, request_body, response_body, status)
         VALUES ($1, 'requisite_enquiry', $2, $3, $4)`,
        [product.provider_code, JSON.stringify({ product_id, requisite, params }), JSON.stringify(result), result.possible ? 'success' : 'error']
      )
    }

    res.json(result)
  } catch (err) {
    console.error('POST /api/validate error:', err)
    res.status(502).json({ error: 'Ошибка валидации', details: err.message })
  }
})

// FR-08: POST /api/pay — отправка платежа провайдеру
app.post('/api/pay', requireAuth, async (req, res) => {
  try {
    const { order_id } = req.body
    if (!order_id) return res.status(400).json({ error: 'order_id обязателен' })

    // Проверяем заказ
    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id])
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Заказ не найден' })

    const order = orderRes.rows[0]

    // Проверка прав: user только свои заказы, admin — любые
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Это не ваш заказ' })
    }

    if (order.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Заказ ещё не оплачен' })
    }

    // Получаем товары заказа
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order_id])
    const items = itemsRes.rows

    const providerItems = items.filter(i => i.provider_code)

    if (providerItems.length === 0) {
      return res.status(400).json({ error: 'В заказе нет услуг для отправки провайдеру' })
    }

    const results = []

    for (const item of providerItems) {
      try {
        const provider = getProvider(item.provider_code)

        const txResult = await provider.pay({
          bearer: item.provider_service_id,
          account: item.product_name, // упрощённо; в реальности — реквизит из заказа
          amount: item.price,
          currency: 'KGS',
          exclude_commission: true,
          info: []
        })

        // Сохраняем транзакцию
        await pool.query(
          `INSERT INTO transactions (order_id, order_item_id, provider_code, provider_transaction_id, provider_service_id, operation, amount, request_body, response_body, status)
           VALUES ($1, $2, $3, $4, $5, 'payment', $6, $7, $8, 'pending')`,
          [order_id, item.id, item.provider_code, txResult.package_id, item.provider_service_id, item.price,
           JSON.stringify(req.body), JSON.stringify(txResult)]
        )

        // Обновляем заказ
        await pool.query(
          `UPDATE orders SET provider_transaction_id = $1, provider_status = 'processing', status = 'processing', updated_at = now() WHERE id = $2`,
          [txResult.package_id, order_id]
        )

        results.push({
          item_id: item.id,
          package_id: txResult.package_id,
          provider_code: item.provider_code
        })

        // Запускаем polling
        startPolling(order_id, txResult.package_id, provider, item)
      } catch (err) {
        console.error(`[pay] Ошибка для товара ${item.id}:`, err.message)
        results.push({
          item_id: item.id,
          error: err.message
        })
      }
    }

    res.json({ results })
  } catch (err) {
    console.error('POST /api/pay error:', err)
    res.status(500).json({ error: 'Ошибка отправки платежа провайдеру', details: err.message })
  }
})

// FR-09: POST /api/status — статус транзакции провайдера
app.post('/api/status', requireAuth, async (req, res) => {
  try {
    const { transaction_id, provider_code } = req.body
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id обязателен' })

    // Определяем провайдера
    let provider
    if (provider_code) {
      provider = getProvider(provider_code)
    } else {
      // Ищем провайдера по transaction_id в БД
      const txRes = await pool.query(
        'SELECT provider_code FROM transactions WHERE provider_transaction_id = $1 OR id = $1',
        [transaction_id]
      )
      if (txRes.rows.length === 0) return res.status(404).json({ error: 'Транзакция не найдена' })
      provider = getProvider(txRes.rows[0].provider_code)
    }

    const status = await provider.status(transaction_id)

    res.json({
      transaction_id,
      ...status
    })
  } catch (err) {
    console.error('POST /api/status error:', err)
    res.status(502).json({ error: 'Ошибка получения статуса', details: err.message })
  }
})

// FR-10: POST /api/precheck — предрасчёт комиссий
app.post('/api/precheck', async (req, res) => {
  try {
    const { product_id, amount } = req.body
    if (!product_id || !amount) return res.status(400).json({ error: 'product_id и amount обязательны' })

    const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id])
    if (productRes.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' })

    const product = productRes.rows[0]
    if (!product.provider_code) return res.status(400).json({ error: 'Товар не привязан к провайдеру' })

    const provider = getProvider(product.provider_code)
    const result = await provider.precheck({
      bearer: product.provider_service_id,
      amount,
      exclude_commission: true
    })

    res.json(result)
  } catch (err) {
    console.error('POST /api/precheck error:', err)
    res.status(502).json({ error: 'Ошибка предрасчёта', details: err.message })
  }
})

// FR-11: POST /api/cancel — отмена транзакции (только admin)
app.post('/api/cancel', requireRole('admin'), async (req, res) => {
  try {
    const { transaction_id, provider_code } = req.body
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id обязателен' })

    let provider
    if (provider_code) {
      provider = getProvider(provider_code)
    } else {
      const txRes = await pool.query(
        'SELECT provider_code FROM transactions WHERE provider_transaction_id = $1 OR id = $1',
        [transaction_id]
      )
      if (txRes.rows.length === 0) return res.status(404).json({ error: 'Транзакция не найдена' })
      provider = getProvider(txRes.rows[0].provider_code)
    }

    const result = await provider.cancel(transaction_id)

    // Логируем в admin_logs
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, 'cancel_transaction', $2)`,
      [req.user.id, JSON.stringify({ transaction_id, provider_code, result })]
    )

    // Обновляем заказ
    await pool.query(
      `UPDATE orders SET provider_status = 'CANCELLED', status = 'cancelled', updated_at = now()
       WHERE provider_transaction_id = $1`,
      [transaction_id]
    )

    res.json({ result: true })
  } catch (err) {
    console.error('POST /api/cancel error:', err)
    res.status(500).json({ error: 'Ошибка отмены', details: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// ИНТЕГРАЦИИ: ПЛАТЕЖНЫЙ ПРОЦЕССИНГ
// ═══════════════════════════════════════════════════════════

// FR-35: POST /api/orders — создание заказа
app.post('/api/orders', requireAuth, rateLimit(getRateLimits().orders || 30), async (req, res) => {
  try {
    const { items, payment_method } = req.body
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Необходимо передать товары' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Получаем товары для расчёта
      const productIds = items.map(i => i.product_id).filter(Boolean)
      let total = 0
      const orderItemsData = []

      for (const item of items) {
        const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [item.product_id])
        if (prodRes.rows.length === 0) {
          throw new Error(`Товар ${item.product_id} не найден`)
        }
        const product = prodRes.rows[0]
        const quantity = item.quantity || 1
        const itemTotal = parseFloat(product.price) * quantity
        total += itemTotal

        orderItemsData.push({
          product_id: product.id,
          product_name: product.name,
          quantity,
          price: product.price,
          provider_code: product.provider_code,
          provider_service_id: product.provider_service_id
        })
      }

      // Создаём заказ
      const orderRes = await client.query(
        `INSERT INTO orders (user_id, total, payment_method, status, payment_status)
         VALUES ($1, $2, $3, 'pending', 'pending') RETURNING *`,
        [req.user.id, total, payment_method || null]
      )
      const order = orderRes.rows[0]

      // Создаём элементы заказа
      for (const item of orderItemsData) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, provider_code, provider_service_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [order.id, item.product_id, item.product_name, item.quantity, item.price, item.provider_code, item.provider_service_id]
        )
      }

      await client.query('COMMIT')

      res.status(201).json({ ...order, items: orderItemsData })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('POST /api/orders error:', err)
    res.status(500).json({ error: 'Ошибка создания заказа', details: err.message })
  }
})

// FR-36: POST /api/payments/process — процессинг платежа
app.post('/api/payments/process', requireAuth, rateLimit(getRateLimits().payments || 20), async (req, res) => {
  try {
    const { order_id, payment_method } = req.body
    if (!order_id || !payment_method) {
      return res.status(400).json({ error: 'order_id и payment_method обязательны' })
    }

    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id])
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Заказ не найден' })

    const order = orderRes.rows[0]

    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Это не ваш заказ' })
    }

    if (order.payment_status !== 'pending') {
      return res.status(400).json({ error: 'Заказ уже оплачен или отменён' })
    }

    // Определяем шлюз через фабрику с fallback
    const { gateway, code: gatewayCode } = resolveGateway(payment_method, paymentGateways)

    const result = await gateway.createPayment({
      order_id: order.id,
      amount: order.total,
      currency: 'RUB',
      description: `Заказ #${order.id}`,
      user: req.user,
      return_url: `https://${req.headers.host || 'localhost:5173'}/orders/${order.id}`,
      payment_way: payment_method
    })

    // Сохраняем платёж
    await pool.query(
      `INSERT INTO payments (order_id, amount, method, status, gateway, gateway_tx_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [order.id, order.total, payment_method, result.status || 'pending', gatewayCode, result.transaction_id,
       JSON.stringify({ redirect_url: result.redirect_url })]
    )

    // Для платежей без редиректа (кошелёк) — сразу обновляем статус заказа
    if (!result.redirect_url && result.status === 'succeeded') {
      await pool.query(
        `UPDATE orders SET payment_status = 'paid', status = 'paid', updated_at = now() WHERE id = $1 AND payment_status = 'pending'`,
        [order.id]
      )
    }

    res.json(result)
  } catch (err) {
    console.error('POST /api/payments/process error:', err)
    res.status(502).json({ error: 'Ошибка обработки платежа', details: err.message })
  }
})

// Валидация IP для webhook'ов платёжных систем
const WEBHOOK_ALLOWED_IPS = new Set()
// Заполняется из .env: SBER_WEBHOOK_IPS, YOOKASSA_WEBHOOK_IPS
if (process.env.SBER_WEBHOOK_IPS) {
  process.env.SBER_WEBHOOK_IPS.split(',').forEach(ip => WEBHOOK_ALLOWED_IPS.add(ip.trim()))
}
if (process.env.YOOKASSA_WEBHOOK_IPS) {
  process.env.YOOKASSA_WEBHOOK_IPS.split(',').forEach(ip => WEBHOOK_ALLOWED_IPS.add(ip.trim()))
}

function webhookIPFilter(allowedEnv) {
  return (req, res, next) => {
    const configIPs = process.env[allowedEnv]
    if (!configIPs) {
      // Если список не настроен — пропускаем с предупреждением
      console.warn(`[webhook] ${allowedEnv} не настроен — IP-фильтрация отключена`)
      return next()
    }
    const ips = configIPs.split(',').map(s => s.trim())
    const clientIP = req.ip || req.connection?.remoteAddress
    if (ips.includes(clientIP)) {
      return next()
    }
    console.warn(`[webhook] Запрос с неразрешённого IP: ${clientIP}`)
    return res.status(403).json({ error: 'Forbidden' })
  }
}

// ─── Авто-триггер доставки услуги после подтверждения платежа ─────
async function triggerProviderFulfillment(orderId) {
  try {
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId])
    const items = itemsRes.rows
    const providerItems = items.filter(i => i.provider_code)
    if (providerItems.length === 0) return

    for (const item of providerItems) {
      try {
        const provider = getProvider(item.provider_code)
        if (!provider) continue

        const txResult = await provider.pay({
          bearer: item.provider_service_id,
          account: item.product_name,
          amount: item.price,
          currency: 'KGS',
          exclude_commission: true,
          info: []
        })

        await pool.query(
          `INSERT INTO transactions (order_id, order_item_id, provider_code, provider_transaction_id, provider_service_id, operation, amount, request_body, response_body, status)
           VALUES ($1, $2, $3, $4, $5, 'payment', $6, $7, $8, 'pending')`,
          [orderId, item.id, item.provider_code, txResult.package_id, item.provider_service_id, item.price,
           '{}', JSON.stringify(txResult)]
        )

        await pool.query(
          `UPDATE orders SET provider_transaction_id = $1, provider_status = 'processing', status = 'processing', updated_at = now() WHERE id = $2 AND provider_transaction_id IS NULL`,
          [txResult.package_id, orderId]
        )

        startPolling(orderId, txResult.package_id, provider, item)
        console.log(`[fulfillment] ✅ Доставка запущена для заказа ${orderId}, item ${item.id}`)
      } catch (err) {
        console.error(`[fulfillment] Ошибка для item ${item.id}:`, err.message)
      }
    }
  } catch (err) {
    console.error('[fulfillment] Ошибка получения товаров:', err.message)
  }
}

// FR-37: POST /api/payments/webhook — callback от ЮKassa
app.post('/api/payments/webhook', webhookIPFilter('YOOKASSA_WEBHOOK_IPS'), async (req, res) => {
  try {
    const gateway = paymentGateways.yookassa
    if (!gateway) return res.status(200).json({ received: true })

    const result = await gateway.processWebhook(req)

    if (result.status === 'succeeded' || result.status === 'waiting_for_capture') {
      const orderId = result.metadata?.order_id

      if (orderId) {
        await pool.query(
          `UPDATE orders SET payment_status = 'paid', status = 'paid', updated_at = now() WHERE id = $1 AND payment_status = 'pending'`,
          [orderId]
        )
        await pool.query(
          `UPDATE payments SET status = 'paid' WHERE gateway_tx_id = $1`,
          [result.transaction_id]
        )
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('POST /api/payments/webhook error:', err)
    res.status(200).json({ received: true })
  }
})

// FR-68: POST /api/payments/webhook/sberbank — уведомления от Сбербанка
app.post('/api/payments/webhook/sberbank', webhookIPFilter('SBER_WEBHOOK_IPS'), async (req, res) => {
  try {
    const gateway = paymentGateways.sberbank
    if (!gateway) return res.status(200).json({ received: true })

    const result = await gateway.processWebhook(req)

    if (result.status === 'paid') {
      // Ищем платёж по transaction_id (sberbank orderId)
      const payRes = await pool.query(
        'SELECT order_id FROM payments WHERE gateway_tx_id = $1 LIMIT 1',
        [result.transaction_id]
      )

      if (payRes.rows.length > 0) {
        const orderId = payRes.rows[0].order_id

        // Обновляем заказ
        await pool.query(
          `UPDATE orders SET payment_status = 'paid', status = 'paid', updated_at = now() WHERE id = $1 AND payment_status = 'pending'`,
          [orderId]
        )
        await pool.query(
          `UPDATE payments SET status = 'paid' WHERE gateway_tx_id = $1`,
          [result.transaction_id]
        )

        // E2E: автоматически запускаем доставку услуги провайдеру
        triggerProviderFulfillment(orderId)
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('POST /api/payments/webhook/sberbank error:', err)
    res.status(200).json({ received: true })
  }
})

// FR-38: POST /api/payments/refund — возврат платежа
app.post('/api/payments/refund', requireRole('admin'), async (req, res) => {
  try {
    const { order_id } = req.body
    if (!order_id) return res.status(400).json({ error: 'order_id обязателен' })

    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id])
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Заказ не найден' })

    const order = orderRes.rows[0]

    // Ищем платёж
    const payRes = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 AND status = $2 LIMIT 1',
      [order_id, 'paid']
    )
    if (payRes.rows.length === 0) return res.status(400).json({ error: 'Платёж не найден или уже возвращён' })

    const payment = payRes.rows[0]
    const gatewayCode = payment.gateway
    const gateway = paymentGateways[gatewayCode]

    if (!gateway) return res.status(500).json({ error: `Шлюз ${gatewayCode} не настроен` })

    const result = await gateway.refundPayment(payment.gateway_tx_id, order.total)

    // Обновляем статус
    await pool.query(
      `UPDATE orders SET payment_status = 'refunded', status = 'cancelled', updated_at = now() WHERE id = $1`,
      [order_id]
    )
    await pool.query(
      `UPDATE payments SET status = 'refunded' WHERE id = $1`,
      [payment.id]
    )

    // Логируем
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, 'refund', $2)`,
      [req.user.id, JSON.stringify({ order_id, result })]
    )

    res.json({ result: true })
  } catch (err) {
    console.error('POST /api/payments/refund error:', err)
    res.status(500).json({ error: 'Ошибка возврата', details: err.message })
  }
})

// FR-38.1: POST /api/payments/reverse — отмена неоплаченного платежа (reverse.do для Сбера)
app.post('/api/payments/reverse', requireRole('admin'), async (req, res) => {
  try {
    const { order_id } = req.body
    if (!order_id) return res.status(400).json({ error: 'order_id обязателен' })

    const payRes = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 AND status = $2 LIMIT 1',
      [order_id, 'pending']
    )
    if (payRes.rows.length === 0) return res.status(400).json({ error: 'Нет неоплаченных платежей для этого заказа' })

    const payment = payRes.rows[0]
    const gateway = paymentGateways[payment.gateway]
    if (!gateway || !gateway.reversePayment) return res.status(500).json({ error: `Шлюз ${payment.gateway} не поддерживает reverse` })

    const result = await gateway.reversePayment(payment.gateway_tx_id)

    await pool.query(
      `UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 AND payment_status = 'pending'`,
      [order_id]
    )
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, 'reverse', $2)`,
      [req.user.id, JSON.stringify({ order_id, result })]
    )

    res.json({ result: true })
  } catch (err) {
    console.error('POST /api/payments/reverse error:', err)
    res.status(500).json({ error: 'Ошибка отмены платежа', details: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// ADMIN: TRANSACTION LOGS
// ═══════════════════════════════════════════════════════════

// GET /api/admin/transactions — расширенные логи транзакций провайдеров
// ═══ Устаревшие admin-эндпоинты — удалены ═══
// Заменены модулями src/routes/admin/*
// Для списка транзакций: GET /api/admin/transactions (новый)
// Для экспорта: GET /api/admin/transactions/export (новый)

// ═══════════════════════════════════════════════════════════
// WALLET OPERATIONS
// ═══════════════════════════════════════════════════════════

// FR-39: GET /api/wallet/balance — текущий баланс
app.get('/api/wallet/balance', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT balance, updated_at FROM wallet_balances WHERE user_id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) {
      return res.json({ balance: 0 })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /api/wallet/balance error:', err)
    res.status(500).json({ error: 'Ошибка получения баланса' })
  }
})

// FR-40: POST /api/wallet/debit — списание с кошелька
app.post('/api/wallet/debit', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const { amount, description } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Некорректная сумма' })

    await client.query('BEGIN')

    const balanceRes = await client.query(
      'SELECT balance FROM wallet_balances WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    )

    if (balanceRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Кошелёк не найден' })
    }

    const currentBalance = parseFloat(balanceRes.rows[0].balance)
    const debitAmount = parseFloat(amount)

    if (currentBalance < debitAmount) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Недостаточно средств' })
    }

    const newBalance = currentBalance - debitAmount

    await client.query(
      'UPDATE wallet_balances SET balance = $1, updated_at = now() WHERE user_id = $2',
      [newBalance, req.user.id]
    )

    const txRes = await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description)
       VALUES ($1, 'debit', $2, $3, $4, $5) RETURNING *`,
      [req.user.id, debitAmount, currentBalance, newBalance, description || 'Списание']
    )

    await client.query('COMMIT')

    res.json({ balance: newBalance, transaction: txRes.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /api/wallet/debit error:', err)
    res.status(500).json({ error: 'Ошибка списания' })
  } finally {
    client.release()
  }
})

// FR-41: POST /api/wallet/credit — пополнение кошелька
app.post('/api/wallet/credit', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const { amount, description } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Некорректная сумма' })

    await client.query('BEGIN')

    const balanceRes = await client.query(
      'SELECT balance FROM wallet_balances WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    )

    if (balanceRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Кошелёк не найден' })
    }

    const currentBalance = parseFloat(balanceRes.rows[0].balance)
    const creditAmount = parseFloat(amount)
    const newBalance = currentBalance + creditAmount

    await client.query(
      'UPDATE wallet_balances SET balance = $1, updated_at = now() WHERE user_id = $2',
      [newBalance, req.user.id]
    )

    const txRes = await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description)
       VALUES ($1, 'credit', $2, $3, $4, $5) RETURNING *`,
      [req.user.id, creditAmount, currentBalance, newBalance, description || 'Пополнение']
    )

    await client.query('COMMIT')

    res.json({ balance: newBalance, transaction: txRes.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /api/wallet/credit error:', err)
    res.status(500).json({ error: 'Ошибка пополнения' })
  } finally {
    client.release()
  }
})

// FR-42: GET /api/wallet/transactions — история операций
app.get('/api/wallet/transactions', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const result = await pool.query(
      `SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/wallet/transactions error:', err)
    res.status(500).json({ error: 'Ошибка получения истории' })
  }
})

// ═══════════════════════════════════════════════════════════
// POLLING LOGIC
// ═══════════════════════════════════════════════════════════

function startPolling(orderId, packageId, provider, item) {
  const pollConfig = getPollingConfig()
  let attempts = 0
  const maxAttempts = pollConfig.active_max_attempts || 24
  const activeInterval = (pollConfig.active_interval_sec || 5) * 1000
  const backgroundInterval = (pollConfig.background_interval_hours || 1) * 3600000
  const maxBackgroundHours = pollConfig.background_max_hours || 24

  console.log(`[polling] Запуск для order=${orderId}, package=${packageId}, provider=${provider.code}`)

  // Активный polling
  const activeTimer = setInterval(async () => {
    attempts++

    try {
      const status = await provider.status(packageId)

      // Сохраняем результат
      await pool.query(
        `UPDATE transactions SET provider_status = $1, response_body = $2, updated_at = now()
         WHERE provider_transaction_id = $3 AND operation = 'payment'`,
        [status.provider_status, JSON.stringify(status), packageId]
      )

      if (status.provider_status === 'COMPLETE' || status.provider_status === 'REBOOKED') {
        clearInterval(activeTimer)
        await pool.query(
          `UPDATE orders SET provider_status = $1, status = 'completed', updated_at = now() WHERE id = $2`,
          [status.provider_status, orderId]
        )
        console.log(`[polling] ✅ Заказ ${orderId} завершён: ${status.provider_status}`)
        return
      }

      if (['FAILURE', 'CANCELLED', 'UNEXPECTED_ERROR'].includes(status.provider_status)) {
        clearInterval(activeTimer)
        console.log(`[polling] ❌ Заказ ${orderId} отменён провайдером: ${status.provider_status}`)

        // Возвращаем деньги через платёжный шлюз
        try {
          const payRes = await pool.query(
            'SELECT * FROM payments WHERE order_id = $1 AND status = $2 LIMIT 1',
            [orderId, 'paid']
          )
          if (payRes.rows.length > 0) {
            const payment = payRes.rows[0]
            const gateway = paymentGateways[payment.gateway]
            if (gateway && gateway.refundPayment) {
              await gateway.refundPayment(payment.gateway_tx_id, null)
              await pool.query(
                `UPDATE payments SET status = 'refunded' WHERE id = $1`,
                [payment.id]
              )
              console.log(`[polling] 💰 Возврат выполнен для платежа ${payment.id}`)
            }
          }
        } catch (refundErr) {
          console.error(`[polling] Ошибка возврата для заказа ${orderId}:`, refundErr.message)
        }

        await pool.query(
          `UPDATE orders SET provider_status = $1, status = 'cancelled', payment_status = 'refunded', updated_at = now() WHERE id = $2`,
          [status.provider_status, orderId]
        )
        return
      }

      if (attempts >= maxAttempts) {
        clearInterval(activeTimer)
        console.log(`[polling] ⏰ Активный polling исчерпан для ${packageId}, перехожу в фоновый`)
        startBackgroundPolling(orderId, packageId, provider)
      }
    } catch (err) {
      console.error(`[polling] Ошибка для ${packageId}:`, err.message)
      if (attempts >= maxAttempts) {
        clearInterval(activeTimer)
        startBackgroundPolling(orderId, packageId, provider)
      }
    }
  }, activeInterval)
}

function startBackgroundPolling(orderId, packageId, provider) {
  const maxBackgroundHours = getPollingConfig().background_max_hours || 24
  const backgroundInterval = (getPollingConfig().background_interval_hours || 1) * 3600000
  const startTime = Date.now()
  let bgAttempts = 0

  const bgTimer = setInterval(async () => {
    bgAttempts++
    const elapsedHours = (Date.now() - startTime) / 3600000

    if (elapsedHours >= maxBackgroundHours) {
      clearInterval(bgTimer)
      console.log(`[polling] 🚨 Таймаут ${maxBackgroundHours}ч для ${packageId}, создаю алерт`)

      // Создаём алерт в admin_logs
      await pool.query(
        `INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, 'pending_transaction', $2)`,
        ['00000000-0000-0000-0000-000000000000',
         JSON.stringify({
           order_id: orderId,
           package_id: packageId,
           provider: provider.code,
           type: 'pending_transaction',
           message: `Транзакция ${packageId} не получила статус за ${maxBackgroundHours}ч`
         })]
      )
      return
    }

    try {
      const status = await provider.status(packageId)

      await pool.query(
        `UPDATE transactions SET provider_status = $1, response_body = $2, updated_at = now()
         WHERE provider_transaction_id = $3 AND operation = 'payment'`,
        [status.provider_status, JSON.stringify(status), packageId]
      )

      if (status.provider_status === 'COMPLETE' || status.provider_status === 'REBOOKED') {
        clearInterval(bgTimer)
        await pool.query(
          `UPDATE orders SET provider_status = $1, status = 'completed', updated_at = now() WHERE id = $2`,
          [status.provider_status, orderId]
        )
        console.log(`[polling] ✅ (фон) Заказ ${orderId} завершён`)
      }

      if (['FAILURE', 'CANCELLED', 'UNEXPECTED_ERROR'].includes(status.provider_status)) {
        clearInterval(bgTimer)
        await pool.query(
          `UPDATE orders SET provider_status = $1, status = 'cancelled', updated_at = now() WHERE id = $2`,
          [status.provider_status, orderId]
        )
        console.log(`[polling] ❌ (фон) Заказ ${orderId} отменён`)
      }
    } catch (err) {
      console.error(`[polling] (фон) Ошибка для ${packageId}:`, err.message)
    }
  }, backgroundInterval)
}

// ═══════════════════════════════════════════════════════════
// REST API (Supabase-совместимый) — существующий
// ═══════════════════════════════════════════════════════════

app.get('/api/rest/v1/:table', async (req, res) => {
  const { table } = req.params
  const { select, order, limit, offset, ...filters } = req.query

  const allowedTables = ['users', 'categories', 'products', 'product_images', 'orders', 'order_items', 'payments', 'reviews', 'wallet_balances', 'wallet_transactions', 'transactions', 'admin_logs']
  if (!allowedTables.includes(table)) {
    return res.status(404).json({ error: 'Table not found' })
  }

  if (!req.user && !['categories', 'products', 'product_images'].includes(table)) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const columns = select === '*' ? '*' : select?.split(',').map(c => c.trim()).join(', ') || '*'
    const whereClauses = []
    const params = []
    let paramIdx = 1

    for (const [key, value] of Object.entries(filters)) {
      if (key.startsWith('eq_')) {
        const column = key.replace('eq_', '')
        whereClauses.push(`${column} = $${paramIdx++}`)
        params.push(value)
      } else if (key.startsWith('neq_')) {
        const column = key.replace('neq_', '')
        whereClauses.push(`${column} != $${paramIdx++}`)
        params.push(value)
      } else if (key.startsWith('gt_')) {
        const column = key.replace('gt_', '')
        whereClauses.push(`${column} > $${paramIdx++}`)
        params.push(value)
      } else if (key.startsWith('gte_')) {
        const column = key.replace('gte_', '')
        whereClauses.push(`${column} >= $${paramIdx++}`)
        params.push(value)
      } else if (key.startsWith('lt_')) {
        const column = key.replace('lt_', '')
        whereClauses.push(`${column} < $${paramIdx++}`)
        params.push(value)
      } else if (key.startsWith('lte_')) {
        const column = key.replace('lte_', '')
        whereClauses.push(`${column} <= $${paramIdx++}`)
        params.push(value)
      } else if (key.startsWith('ilike_')) {
        const column = key.replace('ilike_', '')
        whereClauses.push(`${column} ILIKE $${paramIdx++}`)
        params.push(value)
      }
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

    let orderSQL = ''
    if (order) {
      const parts = order.split('.')
      const col = parts[0]
      // Белый список допустимых колонок
      const allowedColumns = ['id', 'name', 'slug', 'price', 'old_price', 'created_at', 'updated_at', 'sort_order', 'rating', 'review_count', 'stock', 'status', 'payment_status', 'amount', 'balance', 'email', 'display_order']
      const dir = parts[1]?.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      if (allowedColumns.includes(col)) {
        orderSQL = `ORDER BY ${col} ${dir}`
      }
    }

    const limitSQL = limit ? `LIMIT ${parseInt(limit)}` : ''
    const offsetSQL = offset ? `OFFSET ${parseInt(offset)}` : ''

    const query = `SELECT ${columns} FROM ${table} ${whereSQL} ${orderSQL} ${limitSQL} ${offsetSQL}`
    const result = await pool.query(query, params)

    res.json(result.rows)
  } catch (err) {
    console.error(`Error querying ${table}:`, err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/rest/v1/:table', async (req, res) => {
  const { table } = req.params
  const allowedTables = ['users', 'categories', 'products', 'product_images', 'orders', 'order_items', 'payments', 'reviews', 'wallet_balances', 'wallet_transactions', 'transactions', 'admin_logs']
  if (!allowedTables.includes(table)) return res.status(404).json({ error: 'Table not found' })
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })

  try {
    const data = Array.isArray(req.body) ? req.body : [req.body]
    const results = []

    for (const item of data) {
      const keys = Object.keys(item)
      const values = Object.values(item)
      const placeholders = keys.map((_, i) => `$${i + 1}`)
      const columns = keys.join(', ')
      const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`
      const result = await pool.query(query, values)
      results.push(result.rows[0])
    }

    res.status(201).json(Array.isArray(req.body) ? results : results[0])
  } catch (err) {
    console.error(`Error inserting into ${table}:`, err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/api/rest/v1/:table', async (req, res) => {
  const { table } = req.params
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })

  const allowedTables = ['users', 'categories', 'products', 'product_images', 'orders', 'order_items', 'payments', 'reviews', 'wallet_balances', 'wallet_transactions', 'transactions', 'admin_logs']
  if (!allowedTables.includes(table)) {
    return res.status(404).json({ error: 'Table not found' })
  }

  // Upsert mode: { data: {...}, onConflict: 'column' }
  if (req.body?.data && req.body?.onConflict) {
    const { data, onConflict } = req.body
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map((_, i) => `$${i + 1}`)
    const columns = keys.join(', ')

    // PostgreSQL INSERT … ON CONFLICT DO UPDATE
    const exclusions = keys.map(k => `${k} = EXCLUDED.${k}`).join(', ')
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders.join(', ')})
      ON CONFLICT (${onConflict}) DO UPDATE SET ${exclusions}
      RETURNING *`

    const result = await pool.query(query, values)
    return res.json(result.rows[0])
  }

  // Regular update mode
  const { id, ...updates } = req.body
  if (!id) return res.status(400).json({ error: 'id is required' })

  try {
    const keys = Object.keys(updates)
    const values = Object.values(updates)
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`)
    values.push(id)
    const query = `UPDATE ${table} SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`
    const result = await pool.query(query, values)
    res.json(result.rows[0] || { error: 'Not found' })
  } catch (err) {
    console.error(`Error updating ${table}:`, err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/api/rest/v1/:table/:id', async (req, res) => {
  const { table, id } = req.params
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })

  const allowedTables = ['users', 'categories', 'products', 'product_images', 'orders', 'order_items', 'payments', 'reviews', 'wallet_balances', 'wallet_transactions', 'transactions', 'admin_logs']
  if (!allowedTables.includes(table)) {
    return res.status(404).json({ error: 'Table not found' })
  }

  // Валидация UUID для id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid id format (UUID expected)' })
  }

  try {
    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id])
    res.json(result.rows[0] || { error: 'Not found' })
  } catch (err) {
    console.error(`Error deleting from ${table}:`, err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── Health check ─────────────────────────────────────────
app.get('/api/config/payment', async (req, res) => {
  const cfg = getPaymentConfig()
  res.json({ confirmation_timeout_sec: cfg.confirmation_timeout_sec || 10 })
})

// Комбинированный статус подтверждения (Sber + Hyperion)
app.get('/api/confirm-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const result = await pool.query(
      `SELECT id, payment_status, status, provider_status, provider_code, updated_at FROM orders WHERE id = $1`,
      [orderId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' })
    }
    const row = result.rows[0]
    const isSberConfirmed = row.payment_status === 'paid'
    const isHyperionConfirmed = row.status === 'paid' || row.provider_status === 'COMPLETE'
    res.json({
      order_id: row.id,
      payment_status: row.payment_status,
      order_status: row.status,
      provider_status: row.provider_status,
      confirmed: isSberConfirmed && isHyperionConfirmed,
    })
  } catch (err) {
    console.error('GET /api/confirm-status error:', err)
    res.status(500).json({ error: 'Ошибка проверки статуса' })
  }
})

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' })
  }
})

// ═══════════════════════════════════════════════════════════
// PROFILE: ЛИЧНЫЙ КАБИНЕТ ПОЛЬЗОВАТЕЛЯ
// ═══════════════════════════════════════════════════════════

// FR-50: GET /api/auth/profile — полный профиль пользователя
app.get('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, phone, avatar_url, role, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /api/auth/profile error:', err)
    res.status(500).json({ error: 'Ошибка получения профиля' })
  }
})

// FR-51: PUT /api/auth/profile — обновление профиля (name, email, phone)
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body

    const updates = []
    const params = []
    let idx = 1

    if (name !== undefined) {
      // Валидация: непустое имя
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Имя не может быть пустым' })
      }
      updates.push(`name = $${idx++}`)
      params.push(name.trim())
    }

    if (email !== undefined) {
      // Валидация email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Некорректный email' })
      }
      // Проверка уникальности
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      )
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Этот email уже используется' })
      }
      updates.push(`email = $${idx++}`)
      params.push(email)
    }

    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`)
      params.push(phone)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' })
    }

    params.push(req.user.id)
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, phone, role, created_at, updated_at`,
      params
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT /api/auth/profile error:', err)
    res.status(500).json({ error: 'Ошибка обновления профиля' })
  }
})

// FR-52: PUT /api/auth/password — смена пароля
app.put('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password и new_password обязательны' })
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' })
    }

    // Проверяем текущий пароль
    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    const valid = await bcrypt.compare(current_password, userRes.rows[0].password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Неверный текущий пароль' })
    }

    const passwordHash = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id])

    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/auth/password error:', err)
    res.status(500).json({ error: 'Ошибка смены пароля' })
  }
})

// ─── Seed endpoint (только для админа) ───────────────────
app.post('/api/seed', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM categories`)
    const catResult = await pool.query(`
      INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
        ('Игры', 'games', 'Цифровые версии игр, ключи и дополнения', '🎮', 1),
        ('Пополнение кошельков', 'top-ups', 'Пополнение игровых кошельков и платёжных систем', '💰', 2),
        ('Подарочные карты', 'gift-cards', 'Подарочные карты магазинов и сервисов', '🎁', 3),
        ('Подписки', 'subscriptions', 'Подписки на сервисы и игры', '📱', 4),
        ('Аккаунты', 'accounts', 'Готовые игровые аккаунты', '👤', 5),
        ('Услуги', 'services', 'Цифровые услуги и бусты', '⚡', 6),
        ('Мобильная связь', 'mobile', 'Пополнение мобильной связи', '📱', 7)
      RETURNING id, slug
    `)
    const catMap = {}
    catResult.rows.forEach(r => { catMap[r.slug] = r.id })

    await pool.query(`DELETE FROM products`)
    await pool.query(`
      INSERT INTO products (name, slug, description, short_description, price, old_price, category_id, delivery_time, region, rating, review_count, stock, is_active, is_featured, seller_name, seller_verified, features, faq, tags, provider_code, provider_service_id) VALUES
        ('Valorant — 1000 VP', 'valorant-1000-vp', 'Пополнение счётчика Valorant Points на 1000 VP.', '1000 VP для Valorant', 799, 899, '${catMap['top-ups']}', 'Мгновенно', 'Россия', 4.8, 234, 999, true, true, 'Kozagogo Official', true, '["1000 VP"]'::jsonb, '[]'::jsonb, '["valorant","vp","riot"]'::jsonb, NULL, NULL),
        ('Steam Gift Card 500 ₽', 'steam-gift-card-500', 'Подарочная карта Steam номиналом 500 рублей.', 'Steam Gift Card 500 ₽', 500, null, '${catMap['gift-cards']}', '1–5 минут', 'Россия', 4.9, 567, 500, true, true, 'Kozagogo Official', true, '["Номинал 500 ₽"]'::jsonb, '[]'::jsonb, '["steam","gift card"]'::jsonb, NULL, NULL),
        ('Google Play Gift Card 1000 ₽', 'google-play-1000', 'Подарочная карта Google Play на 1000 рублей.', 'Google Play на 1000 ₽', 1000, null, '${catMap['gift-cards']}', '1–5 минут', 'Россия', 4.9, 876, 1000, true, true, 'Kozagogo Official', true, '["Номинал 1000 ₽"]'::jsonb, '[]'::jsonb, '["google play","gift card"]'::jsonb, NULL, NULL)
    `)

    res.json({ status: 'ok', message: 'База данных наполнена' })
  } catch (err) {
    console.error('Seed error:', err)
    res.status(500).json({ error: 'Seed failed' })
  }
})

// ═══════════════════════════════════════════════════════════
// ADMIN PANEL: Маршруты личного кабинета администратора
// ═══════════════════════════════════════════════════════════

import { createAuditMiddleware } from './src/lib/admin/audit.js'
import createAdminAuthRouter, {
  authenticateAdmin,
  requireAdminRole,
  csrfProtectionMiddleware,
  COOKIE_NAME_CSRF,
} from './src/routes/admin/auth.js'
import createAdminCategoriesRouter from './src/routes/admin/categories.js'
import createAdminProductsRouter from './src/routes/admin/products.js'
import createAdminTransactionsRouter from './src/routes/admin/transactions.js'
import createAdminUsersRouter from './src/routes/admin/users.js'

// Создаём admin middleware + роутеры
const adminAudit = createAuditMiddleware(pool)
const adminAuthRouter = createAdminAuthRouter(pool)
const adminCategoriesRouter = createAdminCategoriesRouter(pool, adminAudit)
const adminProductsRouter = createAdminProductsRouter(pool, adminAudit)
const adminTransactionsRouter = createAdminTransactionsRouter(pool, adminAudit)
const adminUsersRouter = createAdminUsersRouter(pool, adminAudit)

// Admin middleware: аутентификация через httpOnly cookie (все /api/admin/*)
app.use('/api/admin', authenticateAdmin)

// Admin auth (login/logout — без CSRF, публичные для админки)
app.use('/api/admin/auth', adminAuthRouter)

// Все остальные admin-роуты — с CSRF-защитой и проверкой роли
app.use('/api/admin/categories',
  csrfProtectionMiddleware,
  requireAdminRole('admin', 'superadmin'),
  adminCategoriesRouter
)

app.use('/api/admin/products',
  csrfProtectionMiddleware,
  requireAdminRole('admin', 'superadmin'),
  adminProductsRouter
)

app.use('/api/admin/transactions',
  csrfProtectionMiddleware,
  requireAdminRole('operator', 'admin', 'superadmin'),
  adminTransactionsRouter
)

app.use('/api/admin/users',
  csrfProtectionMiddleware,
  requireAdminRole('superadmin'),
  adminUsersRouter
)

// Admin logs
import createAdminLogsRouter from './src/routes/admin/logs.js'
const adminLogsRouter = createAdminLogsRouter(pool)

app.use('/api/admin/logs',
  csrfProtectionMiddleware,
  requireAdminRole('operator', 'admin', 'superadmin'),
  adminLogsRouter
)

// Admin config
import createAdminConfigRouter from './src/routes/admin/config.js'
const adminConfigRouter = createAdminConfigRouter(pool, adminAudit)

app.use('/api/admin/config',
  csrfProtectionMiddleware,
  requireAdminRole('admin', 'superadmin'),
  adminConfigRouter
)

// Audit middleware — логирует все state-changing admin-запросы
app.use('/api/admin', adminAudit)

// ─── Запуск ───────────────────────────────────────────────
async function start() {
  try {
    // Инициализируем провайдеров
    await initProviders()
    console.log('[server] Провайдеры инициализированы')

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API Server running on http://0.0.0.0:${PORT}`)
      console.log(`📋 Health: http://localhost:${PORT}/api/health`)
      console.log(`📡 Services: http://localhost:${PORT}/api/services`)
    })
  } catch (err) {
    console.error('[server] Ошибка при старте:', err.message)
    // Сервер всё равно запускаем, провайдеры могут быть недоступны
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API Server running on http://0.0.0.0:${PORT} (без провайдеров)`)
    })
  }
}

start()

export default app
