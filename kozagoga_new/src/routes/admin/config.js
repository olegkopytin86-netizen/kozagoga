// ============================================
// Admin Config — редактирование конфигурации
// Чтение/запись YAML-конфига, секции, reload
// ============================================

import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Путь к файлу конфигурации
const CONFIG_PATH = path.resolve(__dirname, '../../../config/integrations.yaml')

export default function createAdminConfigRouter(pool, audit) {
  const router = Router()

  // ─── GET /api/admin/config — список секций ─────────
  router.get('/', async (req, res) => {
    try {
      // Структура конфигурации с описанием секций
      const configStructure = [
        {
          key: 'providers',
          label: 'Провайдеры услуг',
          description: 'Настройка активных провайдеров (Hyperion, PayBox и др.)',
          fields: [
            { key: 'active', type: 'array', item_type: 'object', description: 'Список активных провайдеров' },
          ],
        },
        {
          key: 'polling',
          label: 'Polling (опрос статусов)',
          description: 'Параметры активного и фонового опроса статусов транзакций',
          fields: [
            { key: 'active_interval_sec', type: 'number', description: 'Интервал активного опроса (сек)' },
            { key: 'active_max_attempts', type: 'number', description: 'Макс. попыток активного опроса' },
            { key: 'background_interval_hours', type: 'number', description: 'Интервал фонового опроса (часы)' },
            { key: 'background_max_hours', type: 'number', description: 'Макс. время фонового опроса (часы)' },
          ],
        },
        {
          key: 'payment_gateways',
          label: 'Платёжные шлюзы',
          description: 'Маппинг методов оплаты на шлюзы (primary + fallback)',
          fields: [
            { key: 'card', type: 'object', description: 'Оплата картой' },
            { key: 'sbp', type: 'object', description: 'СБП' },
            { key: 'wallet', type: 'string', description: 'Кошелёк' },
            { key: 'sberpay', type: 'object', description: 'СберПэй' },
          ],
        },
        {
          key: 'cache',
          label: 'Кэширование',
          description: 'Параметры кэширования списка услуг',
          fields: [
            { key: 'service_list_ttl_sec', type: 'number', description: 'TTL кэша (сек)' },
            { key: 'service_list_strategy', type: 'string', description: 'Стратегия' },
          ],
        },
        {
          key: 'rate_limits',
          label: 'Rate Limiting',
          description: 'Лимиты запросов для API-эндпоинтов',
          fields: [
            { key: 'validate', type: 'number', description: 'Валидация реквизита (запросов/мин)' },
            { key: 'orders', type: 'number', description: 'Создание заказов (запросов/мин)' },
            { key: 'payments', type: 'number', description: 'Платежи (запросов/мин)' },
          ],
        },
        {
          key: 'alerts',
          label: 'Алерты',
          description: 'Настройка уведомлений о проблемах',
          fields: [
            { key: 'pending_transaction', type: 'object', description: 'Алерт о зависших транзакциях' },
          ],
        },
        {
          key: 'retry',
          label: 'Retry-политика',
          description: 'Параметры повторных попыток запросов к провайдерам',
          fields: [
            { key: 'max_attempts', type: 'number', description: 'Макс. попыток' },
            { key: 'base_timeout_ms', type: 'number', description: 'Базовый таймаут (ms)' },
            { key: 'backoff_strategy', type: 'string', description: 'Стратегия: exponential / linear' },
          ],
        },
        {
          key: 'payment',
          label: 'Платежи',
          description: 'Общие настройки платежей',
          fields: [
            { key: 'confirmation_timeout_sec', type: 'number', description: 'Таймаут подтверждения (сек)' },
          ],
        },
      ]

      // Читаем текущий YAML
      let rawYaml = ''
      try {
        rawYaml = fs.readFileSync(CONFIG_PATH, 'utf-8')
      } catch {
        rawYaml = '# Файл конфигурации не найден\n'
      }

      res.json({
        sections: configStructure,
        raw_yaml: rawYaml,
        config_path: CONFIG_PATH,
      })
    } catch (err) {
      console.error('[admin-config] List error:', err)
      res.status(500).json({ error: 'Ошибка получения конфигурации' })
    }
  })

  // ─── GET /api/admin/config/raw — сырой YAML ───────
  router.get('/raw', async (req, res) => {
    try {
      let content = ''
      try {
        content = fs.readFileSync(CONFIG_PATH, 'utf-8')
      } catch {
        content = '# File not found'
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.send(content)
    } catch (err) {
      console.error('[admin-config] Raw read error:', err)
      res.status(500).json({ error: 'Ошибка чтения конфигурации' })
    }
  })

  // ─── PUT /api/admin/config/raw — сохранить YAML ───
  router.put('/raw', async (req, res) => {
    try {
      const { content } = req.body

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'content обязателен' })
      }

      // Бэкап перед записью
      const backupPath = CONFIG_PATH + '.backup.' + Date.now()
      try {
        if (fs.existsSync(CONFIG_PATH)) {
          fs.copyFileSync(CONFIG_PATH, backupPath)
        }
      } catch (backupErr) {
        console.error('[admin-config] Backup error:', backupErr)
        // Non-fatal — продолжаем
      }

      fs.writeFileSync(CONFIG_PATH, content, 'utf-8')

      await audit.log(req, 'config.update', {
        entity_type: 'config',
        backup_path: backupPath,
      })

      res.json({ ok: true, backup_path: backupPath, config_path: CONFIG_PATH })
    } catch (err) {
      console.error('[admin-config] Save error:', err)
      res.status(500).json({ error: 'Ошибка сохранения конфигурации' })
    }
  })

  // ─── POST /api/admin/config/reload — hot-reload ────
  router.post('/reload', async (req, res) => {
    try {
      // Импортируем конфиг-лоадер и принудительно перезагружаем
      const { reloadConfig } = await import('../../lib/config-loader.js')
      const result = await reloadConfig()

      await audit.log(req, 'config.reload', {
        entity_type: 'config',
        result,
      })

      res.json({ ok: true, ...result })
    } catch (err) {
      console.error('[admin-config] Reload error:', err)
      res.status(500).json({ error: 'Ошибка перезагрузки конфигурации', details: err.message })
    }
  })

  // ─── GET /api/admin/config/:section — секция конфига ─
  router.get('/:section', async (req, res) => {
    try {
      const { section } = req.params
      const { getConfig } = await import('../../lib/config-loader.js')

      const fullConfig = getConfig()
      const sectionData = fullConfig[section]

      if (sectionData === undefined) {
        return res.status(404).json({ error: `Секция '${section}' не найдена` })
      }

      res.json({ section, data: sectionData })
    } catch (err) {
      console.error('[admin-config] Get section error:', err)
      res.status(500).json({ error: 'Ошибка получения секции' })
    }
  })

  return router
}
