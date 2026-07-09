// ─── TemplateEngine — рендер body_template с плейсхолдерами ────
// ───────────────────────────────────────────────────────────────

/**
 * Заменяет плейсхолдеры {{path.to.value}} в JSON-шаблоне.
 * Поддерживает вложенные пути и fallback через |.
 * @example renderTemplate({ login: "{{inputs.login}}" }, { inputs: { login: "user123" } })
 *   → { login: "user123" }
 */
export function renderTemplate(template, context) {
  if (typeof template === 'string') {
    return _renderString(template, context)
  }
  if (Array.isArray(template)) {
    return template.map(item => renderTemplate(item, context))
  }
  if (template !== null && typeof template === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(template)) {
      result[key] = renderTemplate(value, context)
    }
    return result
  }
  return template
}

function _renderString(str, context) {
  // Ищем все {{...}}
  return str.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    const value = _resolveExpression(expr.trim(), context)
    return value !== undefined ? String(value) : match
  })
}

function _resolveExpression(expr, context) {
  // Поддержка fallback: expr|default
  const parts = expr.split('|').map(s => s.trim())
  for (const part of parts) {
    const value = _resolvePath(part, context)
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function _resolvePath(path, obj) {
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined
    if (typeof acc === 'object' && key in acc) return acc[key]
    return undefined
  }, obj)
}
