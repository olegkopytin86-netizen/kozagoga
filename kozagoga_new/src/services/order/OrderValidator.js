// ─── OrderValidator — валидация заказа с услугами/регионами ──
// ───────────────────────────────────────────────────────────────

import { sanitizeUserInput } from '../integration/ResponseParser.js'

/**
 * Валидирует запрос на создание заказа.
 * @returns {Object} { valid, items, errors }
 *   valid: boolean
 *   items: валидированные item'ы с данными из БД
 *   errors: массив ошибок { field, code, message }
 */
export async function validateOrderRequest(params, pool) {
  const errors = []
  const items = []

  for (let i = 0; i < (params.items || []).length; i++) {
    const item = params.items[i]
    const prefix = `items[${i}]`

    // Проверка product
    const { rows: products } = await pool.query(
      'SELECT id, name, slug FROM products WHERE id = $1 AND is_active = true LIMIT 1',
      [item.product_id]
    )
    if (products.length === 0) {
      errors.push({ field: `${prefix}.product_id`, code: 'PRODUCT_INACTIVE', message: 'Товар не найден или недоступен' })
      continue
    }
    const product = products[0]

    // Проверка service
    const { rows: services } = await pool.query(
      'SELECT * FROM product_services WHERE id = $1 AND product_id = $2 AND is_active = true LIMIT 1',
      [item.service_id, item.product_id]
    )
    if (services.length === 0) {
      errors.push({
        field: `${prefix}.service_id`,
        code: 'SERVICE_INACTIVE',
        message: `Услуга временно недоступна`,
        suggestion: 'Выберите другую услугу из списка',
      })
      continue
    }
    const service = services[0]

    // Проверка region
    const { rows: regions } = await pool.query(
      'SELECT * FROM service_regions WHERE id = $1 AND service_id = $2 AND is_active = true LIMIT 1',
      [item.region_id, item.service_id]
    )
    if (regions.length === 0) {
      errors.push({ field: `${prefix}.region_id`, code: 'REGION_INACTIVE', message: 'Регион недоступен для данной услуги' })
      continue
    }
    const region = regions[0]

    // Валидация amount
    const amount = parseFloat(item.amount)
    if (isNaN(amount) || amount <= 0) {
      errors.push({ field: `${prefix}.amount`, code: 'INVALID_AMOUNT', message: 'Укажите корректную сумму' })
      continue
    }

    if (region.fixed_amounts && region.fixed_amounts.length > 0) {
      if (!region.fixed_amounts.includes(amount)) {
        errors.push({
          field: `${prefix}.amount`,
          code: 'INVALID_FIXED_AMOUNT',
          message: `Доступные суммы: ${region.fixed_amounts.join(', ')} ${region.currency}`,
        })
        continue
      }
    } else {
      if (region.min_amount && amount < parseFloat(region.min_amount)) {
        errors.push({ field: `${prefix}.amount`, code: 'AMOUNT_TOO_LOW', message: `Минимальная сумма: ${region.min_amount} ${region.currency}` })
        continue
      }
      if (region.max_amount && amount > parseFloat(region.max_amount)) {
        errors.push({ field: `${prefix}.amount`, code: 'AMOUNT_TOO_HIGH', message: `Максимальная сумма: ${region.max_amount} ${region.currency}` })
        continue
      }
    }

    // Получить поля ввода для услуги
    const { rows: inputFields } = await pool.query(
      'SELECT * FROM service_input_fields WHERE service_id = $1 ORDER BY sort_order',
      [item.service_id]
    )

    // Валидация inputs
    const validatedInputs = []
    const inputErrors = []

    for (const fieldDef of inputFields) {
      const userValue = (item.inputs || []).find(inp => inp.field_key === fieldDef.field_key)
      const rawValue = userValue?.value || ''

      if (fieldDef.is_required && !rawValue.trim()) {
        inputErrors.push({
          field: `${prefix}.inputs[${fieldDef.field_key}].value`,
          code: 'REQUIRED',
          message: fieldDef.validation_error || `Поле "${fieldDef.field_label}" обязательно`,
        })
        continue
      }

      if (rawValue.trim()) {
        // Валидация regex
        if (fieldDef.validation_regex) {
          try {
            const regex = new RegExp(fieldDef.validation_regex)
            if (!regex.test(rawValue.trim())) {
              inputErrors.push({
                field: `${prefix}.inputs[${fieldDef.field_key}].value`,
                code: 'INVALID_FORMAT',
                message: fieldDef.validation_error || `Неверный формат поля "${fieldDef.field_label}"`,
                value: rawValue.trim(),
              })
              continue
            }
          } catch (e) {
            // игнорируем битый regex
          }
        }

        // Max length
        if (fieldDef.max_length && rawValue.trim().length > fieldDef.max_length) {
          inputErrors.push({
            field: `${prefix}.inputs[${fieldDef.field_key}].value`,
            code: 'TOO_LONG',
            message: `Максимум ${fieldDef.max_length} символов`,
          })
          continue
        }

        // Санитизация
        const sanitized = sanitizeUserInput(rawValue, fieldDef.field_type)
        validatedInputs.push({
          field_key: fieldDef.field_key,
          field_label: fieldDef.field_label,
          field_type: fieldDef.field_type,
          value: sanitized,
        })
      }
    }

    if (inputErrors.length > 0) {
      errors.push(...inputErrors)
      continue
    }

    // Цена
    const unitPrice = amount * parseFloat(region.price_multiplier || 1)
    const totalPrice = unitPrice * (item.quantity || 1)

    items.push({
      product_id: product.id,
      product_name: product.name,
      service_id: service.id,
      service_name: service.name,
      service_slug: service.slug,
      region_id: region.id,
      region_name: region.region_name,
      region_code: region.region_code,
      currency: region.currency,
      amount,
      quantity: item.quantity || 1,
      unit_price: unitPrice,
      total_price: totalPrice,
      inputs: validatedInputs,
      snapshot: {
        service: { id: service.id, name: service.name, slug: service.slug },
        region: { id: region.id, code: region.region_code, name: region.region_name },
        input_fields: inputFields.map(f => ({ key: f.field_key, label: f.field_label, type: f.field_type })),
        amount,
        price_multiplier: parseFloat(region.price_multiplier || 1),
      },
    })
  }

  return { valid: errors.length === 0, items, errors }
}
