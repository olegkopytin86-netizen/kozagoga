// ─── ProviderMapper — маппинг услуги → внешний провайдер ─────
// ───────────────────────────────────────────────────────────────

import { getPool } from '../../lib/pool.js'
import { ProviderHttpClient } from './ProviderHttpClient.js'
import { renderTemplate } from './TemplateEngine.js'
import { parseProviderResponse, maskSensitiveData } from './ResponseParser.js'
import crypto from 'node:crypto'

const httpClients = new Map()  // provider_code → ProviderHttpClient

function getHttpClient(providerConfig) {
  if (!httpClients.has(providerConfig.provider_code)) {
    httpClients.set(providerConfig.provider_code, new ProviderHttpClient(providerConfig))
  }
  return httpClients.get(providerConfig.provider_code)
}

/**
 * Выполняет запрос к поставщику для одного order_item.
 */
export async function executeProviderRequest(orderItem, inputs, service, region, pool) {
  // 1. Найти маппинг услуги → провайдера
  const { rows: mappings } = await pool.query(
    'SELECT * FROM service_providers WHERE service_id = $1 AND is_active = true LIMIT 1',
    [service.id]
  )
  if (mappings.length === 0) {
    return { success: false, error: 'NO_PROVIDER_MAPPING', errorMessage: `No active provider for service "${service.slug}"` }
  }
  const mapping = mappings[0]

  // 2. Найти конфиг провайдера
  const { rows: configs } = await pool.query(
    'SELECT * FROM provider_configs WHERE provider_code = $1 AND is_active = true LIMIT 1',
    [mapping.provider_code]
  )
  if (configs.length === 0) {
    return { success: false, error: 'PROVIDER_INACTIVE', errorMessage: `Provider "${mapping.provider_code}" is inactive` }
  }
  const providerConfig = configs[0]

  // 3. Собрать render context
  const inputMap = {}
  for (const inp of inputs) {
    inputMap[inp.field_key] = inp.value
  }

  const ctx = {
    inputs: inputMap,
    system: {
      order_id: orderItem.order_id,
      order_item_id: orderItem.id,
      amount: orderItem.total_price || orderItem.price,
      currency: orderItem.currency || 'RUB',
      region: region?.region_code || '',
      region_name: region?.region_name || '',
      service_slug: service.slug,
      created_at: new Date(orderItem.created_at).toISOString(),
    },
  }

  // 4. Рендер body_template
  const body = renderTemplate(mapping.body_template, ctx)

  // 5. Рендер headers_override
  const headers = mapping.headers_override
    ? renderTemplate(mapping.headers_override, ctx)
    : {}

  // 6. Сборка URL
  const url = `${providerConfig.base_url}${mapping.endpoint}`

  // 7. Логирование запроса
  const logResult = await pool.query(
    `INSERT INTO transactions (
      order_id, order_item_id, service_id,
      provider_code, provider_transaction_id,
      direction, http_method, url,
      request_headers, request_body,
      status, operation
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING id`,
    [
      orderItem.order_id,
      orderItem.id,
      service.id,
      mapping.provider_code,
      orderItem.id,  // используем id order_item как idempotency
      'outgoing',
      mapping.http_method || 'POST',
      url,
      JSON.stringify(maskSensitiveData(headers)),
      JSON.stringify(maskSensitiveData(body)),
      'pending',
      'provider_request',
    ]
  )
  const logId = logResult.rows[0].id

  // 8. Выполнение HTTP-запроса с retry
  const httpClient = getHttpClient(providerConfig)
  const startTime = Date.now()
  let lastError = null

  for (let attempt = 1; attempt <= (mapping.retry_count || 0) + 1; attempt++) {
    try {
      const response = await httpClient.request({
        method: mapping.http_method || 'POST',
        url,
        headers,
        body,
        timeout: mapping.timeout_ms,
        idempotencyKey: orderItem.id,
      })

      // Парсинг ответа
      const parsed = parseProviderResponse(response.body, mapping.response_mapping)

      // Обновление лога
      await pool.query(
        `UPDATE transactions SET
          response_body = $1,
          duration_ms = $2,
          retry_attempt = $3,
          provider_status = $4,
          status = $5,
          error = $6,
          updated_at = NOW()
        WHERE id = $7`,
        [
          JSON.stringify(response.body),
          Date.now() - startTime,
          attempt - 1,
          parsed.is_success ? 'success' : 'error',
          parsed.is_success ? 'success' : 'error',
          parsed.is_success ? null : `Non-success response from provider`,
          logId,
        ]
      )

      if (!parsed.is_success) {
        lastError = new ProviderError(
          'PROVIDER_ERROR',
          `Provider returned non-success: ${JSON.stringify(response.body).slice(0, 300)}`,
          response.status,
          false,
          Date.now() - startTime
        )
        continue
      }

      return {
        success: true,
        external_id: parsed.external_id,
        result_value: parsed.result_value,
        raw_response: response.body,
        duration_ms: Date.now() - startTime,
      }

    } catch (err) {
      lastError = err
      const isRetryable = err.retryable && attempt <= (mapping.retry_count || 0)
      if (!isRetryable) break

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) + Math.random() * 500
      await new Promise(r => setTimeout(r, delay))
    }
  }

  // Обновление лога при ошибке
  await pool.query(
    `UPDATE transactions SET
      duration_ms = $1,
      retry_attempt = $2,
      provider_status = 'error',
      status = 'error',
      error = $3,
      updated_at = NOW()
    WHERE id = $4`,
    [
      Date.now() - startTime,
      (mapping.retry_count || 0) + 1,
      lastError?.message || 'Unknown error',
      logId,
    ]
  )

  return {
    success: false,
    error: lastError?.code || 'UNKNOWN',
    errorMessage: lastError?.message || 'Provider request failed',
    retryable: lastError?.retryable || false,
  }
}
