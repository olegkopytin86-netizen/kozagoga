# Performance & Stability Fixes

## 1. Настройка пула соединений

**server.js — заменить:**
```js
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kozagogo',
  user: process.env.DB_USER || 'kozagogo',
  password: process.env.DB_PASS || 'kozagogo_pass_2024',
})
```

**На:**
```js
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kozagogo',
  user: process.env.DB_USER || 'kozagogo',
  password: process.env.DB_PASS || 'kozagogo_pass_2024',
  max: parseInt(process.env.DB_POOL_MAX || '20'),          // макс. соединений
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 сек
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000'), // 5 сек
  maxUses: parseInt(process.env.DB_MAX_USES || '7500'),    // пересоздавать соединение каждые N запросов
})
```

## 2. Замена setInterval-polling на очередь (bull/bull-board)

**Проблема:** setInterval не масштабируется, нет персистентности, теряет статус при рестарте.

**Решение:** заменить polling на очередь задач (Bull + Redis):
```js
import Bull from 'bull'

const paymentQueue = new Bull('payment-polling', {
  redis: { host: 'localhost', port: 6379 }
})

// Producer
paymentQueue.add({ orderId, packageId, providerCode }, {
  delay: 5000,        // первый опрос через 5 сек
  attempts: 100,      // до 100 попыток
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
})

// Consumer
paymentQueue.process(async (job) => {
  const { orderId, packageId, providerCode } = job.data
  const provider = getProvider(providerCode)
  const status = await provider.status(packageId, { timeout: 10000 })
  // ... обработка статуса
  if (status === 'PENDING') throw new Error('still pending') // повтор
})
```

## 3. Атомарный кэш + инвалидация

```js
// Вместо:
servicesCache = services.slice()
servicesCacheTime = Date.now()

// Использовать Map с мьютексом или async-mutex:
import { Mutex } from 'async-mutex'
const servicesMutex = new Mutex()

async function getServicesCached() {
  return servicesMutex.runExclusive(async () => {
    if (servicesCache.length && Date.now() - servicesCacheTime < TTL) {
      return servicesCache
    }
    const data = await fetchAllServices()
    servicesCache = data
    servicesCacheTime = Date.now()
    return data
  })
}
```

## 4. Read/Write splitting

```js
// readPool — для каталога, категорий, публичных эндпоинтов
const readPool = new Pool({ /* те же настройки */ max: 30 })
// writePool — для заказов, платежей, аудита
const writePool = new Pool({ /* те же настройки */ max: 15 })

app.get('/api/services', async (req, res) => {
  const { rows } = await readPool.query('SELECT ...') // readPool
})
app.post('/api/orders', requireAuth, async (req, res) => {
  const { rows } = await writePool.query('INSERT ...') // writePool
})
```

## 5. HTTP-таймауты для провайдеров

В `hyperion-provider.js` — добавить AbortController (доступен в Node 18+):
```js
async pay(params) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15 сек макс

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ... },
      body: JSON.stringify(params),
      signal: controller.signal,
    })
    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}
```

## 6. Кэш категорий

В `server.js`:
```js
const categoryCache = { data: null, time: 0 }
const CATEGORY_CACHE_TTL = 300_000 // 5 минут

app.get('/api/categories', async (req, res) => {
  if (categoryCache.data && Date.now() - categoryCache.time < CATEGORY_CACHE_TTL) {
    return res.json(categoryCache.data)
  }
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY sort_order')
  categoryCache.data = rows
  categoryCache.time = Date.now()
  res.json(rows)
})
```

## 7. Оптимизация CSRF

```js
// Вместо startsWith в цикле — используем Set и exact match
const allowedOriginsSet = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.CORS_ORIGIN || '').split(',').map(s => s.trim())
])

function csrfProtection(req, res, next) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next()
  const origin = req.headers['origin']
  if (origin && !allowedOriginsSet.has(origin)) {
    return res.status(403).json({ error: 'CSRF: Origin not allowed' })
  }
  next()
}
```

## 8. Rate limiter — утечка памяти

```js
// Текущая проблема: Map растёт неограниченно.
// Решение: TTL-очистка при каждом доступе + капа

const RATE_LIMIT_CAP = 10000 // макс записей

function rateLimit(limitPerMin) {
  return (req, res, next) => {
    if (!limitPerMin) return next()
    const key = `${req.ip}:${req.method}:${req.path}`
    const now = Date.now()

    // Очистка устаревших при достижении лимита
    if (rateCounters.size > RATE_LIMIT_CAP) {
      for (const [k, entry] of rateCounters) {
        if (now - entry.start > 60000) rateCounters.delete(k)
      }
    }

    const entry = rateCounters.get(key)
    if (!entry || now - entry.start > 60000) {
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
```

## 9. Prometheus-метрики (на будущее)

```bash
npm install prom-client
```

```js
import client from 'prom-client'

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
})

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, path: req.path, status: res.statusCode })
  })
  next()
})

app.get('/api/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType)
  res.end(await client.register.metrics())
})
```

## 10. Предотвращение race condition в wallet

Текущая реализация уже использует `FOR UPDATE` — это правильно. Но стоит добавить ретрай при deadlock:

```js
async function retryOnDeadlock(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (err.code === '40P01' && i < maxRetries - 1) { // deadlock
        await new Promise(r => setTimeout(r, 100 * (i + 1)))
        continue
      }
      throw err
    }
  }
}
```

## Приоритет внедрения

| Приоритет | Изменение | Ожидаемый эффект | Сложность |
|-----------|-----------|------------------|-----------|
| 🔴 P0 | Настройка пула (max, timeouts) | Предотвращение зависаний | 5 мин |
| 🔴 P0 | Polling → очередь (Bull) | Стабильность, персистентность | 1 день |
| 🔴 P0 | HTTP-таймауты провайдерам | Предотвращение висящих запросов | 1 час |
| 🟡 P1 | Атомарный кэш (mutex) | Защита от race condition | 30 мин |
| 🟡 P1 | Rate limiter — cap записей | Предотвращение утечки памяти | 15 мин |
| 🟡 P2 | Read/Write pool split | Утилизация соединений | 1 час |
| 🟢 P2 | Кэш категорий | Снижение нагрузки на БД | 15 мин |
| 🟢 P3 | CSRF → Set вместо startsWith | Микро-оптимизация | 5 мин |
| 🟢 P3 | Prometheus метрики | Мониторинг | 2 часа |
| 🟢 P3 | Retry on deadlock | Стабильность wallet | 15 мин |
