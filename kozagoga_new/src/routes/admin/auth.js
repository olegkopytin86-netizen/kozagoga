// ============================================
// Admin Auth & Middleware
// httpOnly cookie (JWT) + CSRF Double-Submit Cookie
// ============================================
// Аутентификация админов отделена от пользовательской:
// - JWT в httpOnly Secure SameSite=Strict cookie
// - CSRF-токен в readable cookie + X-CSRF-Token header
// - Роли: viewer / operator / admin / superadmin
// ============================================

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { isValidEmail } from '../../lib/validation.js'

// Lazy getter — env vars доступны после dotenv.config() в server.js
function getJwtSecret() {
  const secret = process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    console.warn('⚠️  JWT_SECRET_ADMIN не задан или слишком короткий. Используем JWT_SECRET (только для dev).')
  }
  return secret || 'dev-fallback-secret-2026-min-32-chars!!'
}

const COOKIE_NAME_TOKEN = 'admin_token'
const COOKIE_NAME_CSRF = 'admin_csrf'
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '24h'
const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 минут

// ─── CSRF: генерация и валидация ─────────────────────

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Middleware: проверка CSRF-токена на state-changing запросах
 */
function csrfProtection(req, res, next) {
  // Только POST, PUT, DELETE, PATCH
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next()

  const csrfCookie = req.cookies?.[COOKIE_NAME_CSRF]
  const csrfHeader = req.headers['x-csrf-token']

  if (!csrfCookie || !csrfHeader) {
    return res.status(403).json({ error: 'CSRF: отсутствует токен' })
  }

  if (csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'CSRF: неверный токен' })
  }

  next()
}

// ─── JWT: создание и верификация ─────────────────────

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  )
}

function signRefreshToken(admin) {
  return jwt.sign(
    { id: admin.id, type: 'refresh' },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_TTL }
  )
}

/**
 * Middleware: аутентификация админа из httpOnly cookie
 * Добавляет req.admin если токен валиден, иначе req.admin = null
 */
function authenticateAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME_TOKEN]
  if (!token) {
    req.admin = null
    return next()
  }

  try {
    req.admin = jwt.verify(token, getJwtSecret())
    next()
  } catch (err) {
    req.admin = null
    // Пробуем refresh, если access истёк
    if (err.name === 'TokenExpiredError') {
      return tryRefreshToken(req, res, next)
    }
    next()
  }
}

/**
 * Попытка обновить access token через refresh token
 * Refresh token хранится в отдельном httpOnly cookie
 */
function tryRefreshToken(req, res, next) {
  const refreshCookie = req.cookies?.['admin_refresh']
  if (!refreshCookie) {
    req.admin = null
    return next()
  }

  try {
    const payload = jwt.verify(refreshCookie, getJwtSecret())
    if (payload.type !== 'refresh') {
      req.admin = null
      return next()
    }

    // Получаем свежие данные пользователя из БД
    req.db.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND role IN ($2, $3, $4, $5)',
      [payload.id, 'viewer', 'operator', 'admin', 'superadmin']
    ).then(result => {
      if (result.rows.length === 0) {
        req.admin = null
        return next()
      }

      const admin = result.rows[0]
      req.admin = { id: admin.id, email: admin.email, role: admin.role }

      // Обновляем access token cookie
      const newToken = signAdminToken(admin)
      res.cookie(COOKIE_NAME_TOKEN, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 min
        path: '/api/admin',
      })

      next()
    }).catch(() => {
      req.admin = null
      next()
    })
  } catch {
    req.admin = null
    next()
  }
}

/**
 * Middleware: проверка роли админа
 * @param  {...string} roles - разрешённые роли
 */
function requireAdminRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) {
      console.log('[admin-auth] requireAdminRole FAIL:', req.method, req.path, 'admin=', req.admin, 'cookies=', req.cookies?.[COOKIE_NAME_TOKEN]?.substring(0, 20))
      return res.status(401).json({ error: 'Не авторизован' })
    }

    // Проверка idle timeout
    if (req.admin._lastActivity && (Date.now() - req.admin._lastActivity > IDLE_TIMEOUT_MS)) {
      res.clearCookie(COOKIE_NAME_TOKEN, { path: '/api/admin' })
      res.clearCookie(COOKIE_NAME_CSRF, { path: '/api/admin' })
      return res.status(401).json({ error: 'Сессия истекла из-за бездействия' })
    }

    if (roles.length > 0 && !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' })
    }

    // Обновляем время активности
    req.admin._lastActivity = Date.now()

    next()
  }
}

// ─── Создаём роутер ──────────────────────────────────

export default function createAdminAuthRouter(pool) {
  const router = Router()

  // POST /api/admin/auth/login
  router.post('/login', async (req, res) => {
    try {
      let { email, password } = req.body
      if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' })
      }
      if (password.length > 128) {
        return res.status(400).json({ error: 'Некорректные данные' })
      }

      email = (email || '').trim().toLowerCase()
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Некорректный email' })
      }

      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND role IN ($2, $3, $4, $5)',
        [email, 'viewer', 'operator', 'admin', 'superadmin']
      )

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Неверный email или пароль' })
      }

      const user = result.rows[0]
      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) {
        return res.status(401).json({ error: 'Неверный email или пароль' })
      }

      const admin = { id: user.id, email: user.email, role: user.role }
      const token = signAdminToken(admin)
      const refreshToken = signRefreshToken(admin)
      const csrfToken = generateCsrfToken()

      // Set cookies
      res.cookie(COOKIE_NAME_TOKEN, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 min
        path: '/api/admin',
      })

      res.cookie('admin_refresh', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24h
        path: '/api/admin',
      })

      // CSRF-токен: Path=/ чтобы JS на страницах /admin/* мог читать document.cookie
      res.cookie(COOKIE_NAME_CSRF, csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      })

      // Логируем вход
      await pool.query(
        `INSERT INTO admin_logs (admin_id, action, entity_type, ip)
         VALUES ($1, $2, $3, $4)`,
        [admin.id, 'auth.login', 'session', req.ip || req.headers['x-forwarded-for']]
      ).catch(err => console.error('[admin-auth] audit error:', err.message))

      res.json({
        user: admin,
        csrf_token: csrfToken,
      })
    } catch (err) {
      console.error('[admin-auth] Login error:', err)
      res.status(500).json({ error: 'Ошибка входа' })
    }
  })

  // POST /api/admin/auth/logout
  router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME_TOKEN, { path: '/api/admin' })
    res.clearCookie('admin_refresh', { path: '/api/admin' })
    res.clearCookie(COOKIE_NAME_CSRF, { path: '/' })
    res.json({ ok: true })
  })

  // GET /api/admin/auth/me
  router.get('/me', requireAdminRole(), async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, email, role, created_at FROM users WHERE id = $1',
        [req.admin.id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' })
      }
      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-auth] Me error:', err)
      res.status(500).json({ error: 'Ошибка получения профиля' })
    }
  })

  // POST /api/admin/auth/csrf — получить новый CSRF-токен (при необходимости)
  router.post('/csrf', requireAdminRole(), (req, res) => {
    const csrfToken = generateCsrfToken()
    res.cookie(COOKIE_NAME_CSRF, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    })
    res.json({ csrf_token: csrfToken })
  })

  return router
}

export {
  authenticateAdmin,
  requireAdminRole,
  csrfProtection as csrfProtectionMiddleware,
  COOKIE_NAME_CSRF,
}
