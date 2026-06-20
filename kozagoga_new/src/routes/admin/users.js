// ============================================
// Admin User Management (superadmin only)
// Управление администраторами: создание, блокировка, смена роли
// ============================================

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { isValidEmail } from '../../lib/validation.js'

export default function createAdminUsersRouter(pool, audit) {
  const router = Router()

  // ─── GET /api/admin/users — список админов ─────────
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, email, role, created_at,
                (SELECT COUNT(*) FROM admin_logs WHERE admin_id = users.id) as action_count,
                (SELECT MAX(created_at) FROM admin_logs WHERE admin_id = users.id) as last_action_at
         FROM users
         WHERE role IN ('viewer', 'operator', 'admin', 'superadmin')
         ORDER BY created_at DESC`
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[admin-users] List error:', err)
      res.status(500).json({ error: 'Ошибка получения списка администраторов' })
    }
  })

  // ─── POST /api/admin/users — создать админа ────────
  router.post('/', async (req, res) => {
    try {
      let { email, password, role } = req.body

      if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' })
      }

      email = (email || '').trim().toLowerCase()
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Некорректный email' })
      }

      const allowedRoles = ['viewer', 'operator', 'admin']
      const targetRole = role || 'admin'
      if (!allowedRoles.includes(targetRole)) {
        return res.status(400).json({
          error: `Недопустимая роль. Допустимые: ${allowedRoles.join(', ')}`,
        })
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' })
      }

      // Проверка дубликата
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' })
      }

      const passwordHash = await bcrypt.hash(password, 10)
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
        [email, passwordHash, targetRole]
      )

      const admin = result.rows[0]

      await audit.log(req, 'user.create', {
        entity_id: admin.id,
        email: admin.email,
        role: targetRole,
      })

      res.status(201).json(admin)
    } catch (err) {
      console.error('[admin-users] Create error:', err)
      res.status(500).json({ error: 'Ошибка создания администратора' })
    }
  })

  // ─── PATCH /api/admin/users/:id — изменить роль / заблокировать ──
  router.patch('/:id', async (req, res) => {
    try {
      const { role, is_blocked } = req.body
      const targetId = req.params.id

      const existing = await pool.query('SELECT * FROM users WHERE id = $1', [targetId])
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' })
      }

      const currentUser = existing.rows[0]

      // Нельзя изменить superadmin
      if (currentUser.role === 'superadmin' && req.admin.id !== targetId) {
        return res.status(403).json({ error: 'Нельзя изменить superadmin' })
      }

      // Нельзя снять последнего superadmin
      if (currentUser.role === 'superadmin' && role && role !== 'superadmin') {
        const superadminCount = await pool.query(
          'SELECT COUNT(*) FROM users WHERE role = $1', ['superadmin']
        )
        if (parseInt(superadminCount.rows[0].count) <= 1) {
          return res.status(400).json({ error: 'Нельзя снять роль superadmin с последнего администратора' })
        }
      }

      const updates = []
      const params = []
      let idx = 1

      if (role) {
        const allowedRoles = ['viewer', 'operator', 'admin', 'superadmin']
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ error: `Недопустимая роль: ${role}` })
        }
        updates.push(`role = $${idx++}`)
        params.push(role)
      }

      if (is_blocked !== undefined) {
        // Блокировка через роль 'blocked'
        updates.push(`role = $${idx++}`)
        params.push(is_blocked ? 'blocked' : null) // restore not supported yet
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Нет полей для обновления' })
      }

      params.push(targetId)
      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, role, created_at`,
        params
      )

      await audit.log(req, 'user.update', {
        entity_id: targetId,
        changes: { role, is_blocked },
      })

      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-users] Update error:', err)
      res.status(500).json({ error: 'Ошибка обновления пользователя' })
    }
  })

  // ─── DELETE /api/admin/users/:id — удалить админа ──
  router.delete('/:id', async (req, res) => {
    try {
      let targetId = req.params.id

      // Защита: если id === 'me' — некорректный запрос
      if (targetId === 'me') {
        return res.status(400).json({ error: 'Используйте PATCH /users/me для смены пароля' })
      }

      // Валидация UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(targetId)) {
        return res.status(400).json({ error: 'Некорректный ID пользователя' })
      }

      // Нельзя удалить себя
      if (targetId === req.admin.id) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' })
      }

      const existing = await pool.query(
        'SELECT * FROM users WHERE id = $1 AND role IN ($2, $3, $4, $5)',
        [targetId, 'viewer', 'operator', 'admin', 'superadmin']
      )

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' })
      }

      const user = existing.rows[0]

      // Нельзя удалить superadmin
      if (user.role === 'superadmin') {
        const superadminCount = await pool.query(
          'SELECT COUNT(*) FROM users WHERE role = $1', ['superadmin']
        )
        if (parseInt(superadminCount.rows[0].count) <= 1) {
          return res.status(400).json({ error: 'Нельзя удалить последнего superadmin' })
        }
      }

      // Soft-delete: помечаем как blocked, не удаляем физически (сохраняем audit trail)
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['blocked', targetId])

      await audit.log(req, 'user.delete', {
        entity_id: targetId,
        email: user.email,
        previous_role: user.role,
      })

      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-users] Delete error:', err)
      res.status(500).json({ error: 'Ошибка удаления пользователя' })
    }
  })

  // ─── GET /api/admin/users/me — профиль текущего админа ──
  router.get('/me', async (req, res) => {
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
      console.error('[admin-users] Me error:', err)
      res.status(500).json({ error: 'Ошибка получения профиля' })
    }
  })

  // ─── PATCH /api/admin/users/me — сменить пароль ────
  router.patch('/me', async (req, res) => {
    try {
      const { current_password, new_password } = req.body

      if (!current_password || !new_password) {
        return res.status(400).json({ error: 'current_password и new_password обязательны' })
      }

      if (new_password.length < 8) {
        return res.status(400).json({ error: 'Новый пароль должен быть не менее 8 символов' })
      }

      const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.admin.id])
      const valid = await bcrypt.compare(current_password, user.rows[0].password_hash)
      if (!valid) {
        return res.status(401).json({ error: 'Неверный текущий пароль' })
      }

      const passwordHash = await bcrypt.hash(new_password, 10)
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.admin.id])

      await audit.log(req, 'user.change_password', {})

      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-users] Change password error:', err)
      res.status(500).json({ error: 'Ошибка смены пароля' })
    }
  })

  // ─── GET /api/admin/users/logs — логи действий админов (superadmin) ──
  router.get('/logs', async (req, res) => {
    try {
      const { admin_id, action, page = '1', limit = '50' } = req.query
      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
      const offset = (pageNum - 1) * limitNum

      let query = `
        SELECT al.*, u.email as admin_email
        FROM admin_logs al
        LEFT JOIN users u ON u.id = al.admin_id
      `
      const params = []
      const conditions = []
      let idx = 1

      if (admin_id) {
        conditions.push(`al.admin_id = $${idx++}`)
        params.push(admin_id)
      }
      if (action) {
        conditions.push(`al.action ILIKE $${idx++}`)
        params.push(`%${action}%`)
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM admin_logs al ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`,
        params
      )
      const total = parseInt(countResult.rows[0].count)

      query += ' ORDER BY al.created_at DESC'
      query += ` LIMIT $${idx++} OFFSET $${idx++}`
      params.push(limitNum, offset)

      const result = await pool.query(query, params)

      res.json({
        items: result.rows,
        pagination: { page: pageNum, limit: limitNum, total, total_pages: Math.ceil(total / limitNum) },
      })
    } catch (err) {
      console.error('[admin-users] Logs error:', err)
      res.status(500).json({ error: 'Ошибка получения логов' })
    }
  })

  return router
}
