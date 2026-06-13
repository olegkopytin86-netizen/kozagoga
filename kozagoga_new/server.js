// Kozagogo Backend API Server
// PostgreSQL + Express + JWT Auth

import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pkg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const { Pool } = pkg

// ─── Конфигурация ────────────────────────────────────────
const PORT = process.env.API_PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'kozagogo-dev-secret-change-in-production'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kozagogo',
  user: process.env.DB_USER || 'kozagogo',
  password: process.env.DB_PASS || 'kozagogo_pass_2024',
})

// ─── Express setup ────────────────────────────────────────
const app = express()
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}))
app.use(express.json())

// ─── Auth middleware ──────────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    // Без токена — только публичные таблицы и read-only
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
app.use(authenticate)

// ─── Auth endpoints ───────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' })
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' })
    }

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
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' })
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }

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

// ─── REST API (Supabase-совместимый) ──────────────────────
// GET /api/rest/v1/:table?select=*&eq_column=value&order=column.asc&limit=10&offset=0
app.get('/api/rest/v1/:table', async (req, res) => {
  const { table } = req.params
  const { select, order, limit, offset, ...filters } = req.query

  // Только разрешённые таблицы
  const allowedTables = ['users', 'categories', 'products', 'product_images', 'orders', 'order_items', 'payments', 'reviews', 'wallet_balances', 'admin_logs']
  if (!allowedTables.includes(table)) {
    return res.status(404).json({ error: 'Table not found' })
  }

  // Если нет auth — только публичные таблицы
  if (!req.user && !['categories', 'products', 'product_images'].includes(table)) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const columns = select === '*' ? '*' : select?.split(',').map(c => c.trim()).join(', ') || '*'

    // WHERE clauses from eq_ params
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

    // ORDER BY
    let orderSQL = ''
    if (order) {
      const parts = order.split('.')
      const col = parts[0]
      const dir = parts[1]?.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      // Whitelist columns to prevent SQL injection
      if (col.match(/^[a-z_]+$/)) {
        orderSQL = `ORDER BY ${col} ${dir}`
      }
    }

    // LIMIT / OFFSET
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

// POST /api/rest/v1/:table — Insert
app.post('/api/rest/v1/:table', async (req, res) => {
  const { table } = req.params
  const allowedTables = ['users', 'categories', 'products', 'product_images', 'orders', 'order_items', 'payments', 'reviews', 'wallet_balances', 'admin_logs']
  if (!allowedTables.includes(table)) {
    return res.status(404).json({ error: 'Table not found' })
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

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

// PUT /api/rest/v1/:table — Update
app.put('/api/rest/v1/:table', async (req, res) => {
  const { table } = req.params
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })

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

// DELETE /api/rest/v1/:table/:id
app.delete('/api/rest/v1/:table/:id', async (req, res) => {
  const { table, id } = req.params
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })

  try {
    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id])
    res.json(result.rows[0] || { error: 'Not found' })
  } catch (err) {
    console.error(`Error deleting from ${table}:`, err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── Health check ─────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' })
  }
})

// ─── Seed endpoint ────────────────────────────────────────
app.post('/api/seed', async (req, res) => {
  try {
    // Categories
    await pool.query(`DELETE FROM categories`)
    const catResult = await pool.query(`
      INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
        ('Игры', 'games', 'Цифровые версии игр, ключи и дополнения', '🎮', 1),
        ('Пополнение кошельков', 'top-ups', 'Пополнение игровых кошельков и платёжных систем', '💰', 2),
        ('Подарочные карты', 'gift-cards', 'Подарочные карты магазинов и сервисов', '🎁', 3),
        ('Подписки', 'subscriptions', 'Подписки на сервисы и игры', '📱', 4),
        ('Аккаунты', 'accounts', 'Готовые игровые аккаунты', '👤', 5),
        ('Услуги', 'services', 'Цифровые услуги и бусты', '⚡', 6)
      RETURNING id, slug
    `)
    const catMap = {}
    catResult.rows.forEach(r => { catMap[r.slug] = r.id })

    // Products
    await pool.query(`DELETE FROM products`)
    await pool.query(`
      INSERT INTO products (name, slug, description, short_description, price, old_price, category_id, delivery_time, region, rating, review_count, stock, is_active, is_featured, seller_name, seller_verified, features, faq, tags) VALUES
        ('Valorant — 1000 VP', 'valorant-1000-vp', 'Пополнение счётчика Valorant Points на 1000 VP. Мгновенная доставка на ваш аккаунт Riot Games.', '1000 VP для Valorant', 799, 899, '${catMap['top-ups']}', 'Мгновенно', 'Россия', 4.8, 234, 999, true, true, 'Kozagogo Official', true, '["1000 VP на ваш аккаунт","Мгновенная доставка","Работает во всех регионах","Поддержка 24/7"]'::jsonb, '[{"question":"Как получить VP?","answer":"После оплаты укажите ваш Riot ID, и мы отправим VP в течение минуты."},{"question":"Работает ли в РФ?","answer":"Да, пополнение работает для аккаунтов всех регионов."}]'::jsonb, '["valorant","vp","riot","пополнение"]'::jsonb),
        ('Steam Gift Card 500 ₽', 'steam-gift-card-500', 'Подарочная карта Steam номиналом 500 рублей.', 'Подарочная карта Steam на 500 ₽', 500, null, '${catMap['gift-cards']}', '1–5 минут', 'Россия', 4.9, 567, 500, true, true, 'Kozagogo Official', true, '["Номинал 500 ₽","Активация в Steam","Пополнение кошелька"]'::jsonb, '[{"question":"Как активировать?","answer":"Код придёт на email. Активируйте в клиенте Steam."}]'::jsonb, '["steam","gift card","подарок","игры"]'::jsonb),
        ('PlayStation Plus Essential (1 месяц)', 'ps-plus-essential-1m', 'Подписка PlayStation Plus Essential на 1 месяц.', 'PS Plus Essential на 1 месяц', 699, 799, '${catMap['subscriptions']}', 'Мгновенно', 'Россия', 4.7, 189, 300, true, false, 'Kozagogo Official', true, '["1 месяц PS Plus Essential","Многопользовательская игра","2 бесплатные игры в месяц"]'::jsonb, '[{"question":"Подходит для РФ аккаунта?","answer":"Да, код активируется на российском аккаунте PSN."}]'::jsonb, '["playstation","ps plus","подписка","sony"]'::jsonb),
        ('PUBG — 1000 G-COIN', 'pubg-1000-gcoin', 'Пополнение G-COIN в PUBG.', '1000 G-COIN для PUBG', 249, null, '${catMap['top-ups']}', 'Мгновенно', 'Россия', 4.6, 145, 800, true, false, 'Kozagogo Official', true, '["1000 G-COIN","Для PC и консолей","Мгновенно"]'::jsonb, '[]'::jsonb, '["pubg","g-coin","пополнение"]'::jsonb),
        ('World of Warcraft — 60 дней', 'wow-60-days', '60 дней игрового времени для WoW.', '60 дней WoW', 1499, 1799, '${catMap['subscriptions']}', '1–5 минут', 'Европа', 4.8, 98, 200, true, false, 'Kozagogo Official', true, '["60 дней игрового времени","Для всех версий WoW","Активация на Battle.net"]'::jsonb, '[{"question":"Как активировать?","answer":"Код активируется в личном кабинете Battle.net."}]'::jsonb, '["wow","world of warcraft","подписка","blizzard"]'::jsonb),
        ('Xbox Game Pass Ultimate (1 месяц)', 'xbox-game-pass-ultimate-1m', 'Xbox Game Pass Ultimate на 1 месяц.', 'Xbox Game Pass Ultimate на месяц', 999, null, '${catMap['subscriptions']}', 'Мгновенно', 'Россия', 4.7, 312, 400, true, true, 'Kozagogo Official', true, '["1 месяц Ultimate","Xbox + PC","EA Play включён"]'::jsonb, '[]'::jsonb, '["xbox","game pass","microsoft","подписка"]'::jsonb),
        ('Fortnite — 1000 V-Bucks', 'fortnite-1000-vbucks', '1000 V-Bucks для Fortnite.', '1000 V-Bucks', 599, 699, '${catMap['top-ups']}', 'Мгновенно', 'Россия', 4.5, 423, 600, true, false, 'Kozagogo Official', true, '["1000 V-Bucks","Для всех платформ","Мгновенная доставка"]'::jsonb, '[]'::jsonb, '["fortnite","v-bucks","пополнение","эпик"]'::jsonb),
        ('Google Play Gift Card 1000 ₽', 'google-play-1000', 'Подарочная карта Google Play на 1000 рублей.', 'Google Play на 1000 ₽', 1000, null, '${catMap['gift-cards']}', '1–5 минут', 'Россия', 4.9, 876, 1000, true, true, 'Kozagogo Official', true, '["Номинал 1000 ₽","Для Google Play","Активация в приложении"]'::jsonb, '[{"question":"Как активировать?","answer":"Код придёт на email. Активируйте в Google Play."}]'::jsonb, '["google play","gift card","подарок","android"]'::jsonb)
    `)

    res.json({ status: 'ok', message: 'База данных наполнена' })
  } catch (err) {
    console.error('Seed error:', err)
    res.status(500).json({ error: 'Seed failed' })
  }
})

// ─── Запуск ───────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server running on http://0.0.0.0:${PORT}`)
  console.log(`📋 Health: http://localhost:${PORT}/api/health`)
})

export default app
