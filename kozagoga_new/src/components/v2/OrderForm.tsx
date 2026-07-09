// ─── OrderForm — динамическая форма заказа с услугами/регионами ─
// Использует v2 API (/api/v1/products/:slug, /api/v1/orders)
// ───────────────────────────────────────────────────────────────

import { useState, useEffect, useReducer, useCallback } from 'react'
import { Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────

/** @typedef {Object} InputField
 * @property {string} key
 * @property {string} label
 * @property {string} type
 * @property {string} placeholder
 * @property {string|null} validation_regex
 * @property {string|null} validation_error
 * @property {boolean} is_required
 * @property {number} max_length
 * @property {string[]} [options] */

// ─── Reducer ───────────────────────────────────────────────────

const initialState = {
  selectedServiceId: null,
  selectedRegionId: null,
  amount: null,
  inputs: {},
  price: null,
  priceLoading: false,
  priceError: null,
  orderCreating: false,
  orderError: null,
  createdOrder: null,
  inputErrors: {},
}

function orderFormReducer(state, action) {
  switch (action.type) {
    case 'SELECT_SERVICE':
      return { ...state, selectedServiceId: action.serviceId, selectedRegionId: null, amount: null, price: null, inputs: {}, inputErrors: {} }
    case 'SELECT_REGION':
      return { ...state, selectedRegionId: action.regionId, amount: null, price: null, inputErrors: {} }
    case 'SET_AMOUNT':
      return { ...state, amount: action.amount }
    case 'SET_INPUT':
      return { ...state, inputs: { ...state.inputs, [action.key]: action.value }, inputErrors: { ...state.inputErrors, [action.key]: null } }
    case 'SET_PRICE':
      return { ...state, price: action.price, priceLoading: false, priceError: null }
    case 'PRICE_LOADING':
      return { ...state, priceLoading: true, priceError: null }
    case 'PRICE_ERROR':
      return { ...state, priceLoading: false, priceError: action.error }
    case 'VALIDATION_ERROR':
      return { ...state, inputErrors: { ...state.inputErrors, ...action.errors } }
    case 'ORDER_CREATING':
      return { ...state, orderCreating: true, orderError: null }
    case 'ORDER_CREATED':
      return { ...state, orderCreating: false, createdOrder: action.order }
    case 'ORDER_ERROR':
      return { ...state, orderCreating: false, orderError: action.error }
    default:
      return state
  }
}

// ─── Component ──────────────────────────────────────────────────

export default function OrderForm({ product, onOrderCreated, onError, className }) {
  const [state, dispatch] = useReducer(orderFormReducer, initialState)
  const API_BASE = window.__KOZAGOGA_API_URL__ || ''

  // Auto-select first service on mount
  useEffect(() => {
    if (product.services?.length > 0 && !state.selectedServiceId) {
      dispatch({ type: 'SELECT_SERVICE', serviceId: product.services[0].id })
    }
  }, [product.id])

  const currentService = product.services?.find(s => s.id === state.selectedServiceId)
  const currentRegion = currentService?.regions?.find(r => r.id === state.selectedRegionId)

  // Price calculation
  useEffect(() => {
    if (!state.selectedRegionId || !state.amount) return

    const timer = setTimeout(async () => {
      dispatch({ type: 'PRICE_LOADING' })
      try {
        const res = await fetch(`${API_BASE}/api/v1/price/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            service_id: state.selectedServiceId,
            region_id: state.selectedRegionId,
            amount: state.amount,
          }),
        })
        if (!res.ok) throw new Error('Price calculation failed')
        const data = await res.json()
        dispatch({ type: 'SET_PRICE', price: data })
      } catch (err) {
        dispatch({ type: 'PRICE_ERROR', error: err.message })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [state.selectedRegionId, state.amount, product.id])

  const handleSubmit = useCallback(async () => {
    if (!currentService || !currentRegion || !state.amount) return

    // Client-side validation
    const errors = {}
    for (const field of currentService.input_fields) {
      const value = state.inputs[field.key] || ''
      if (field.is_required && !value.trim()) {
        errors[field.key] = field.validation_error || `Поле "${field.label}" обязательно`
      }
      if (value && field.validation_regex) {
        try {
          if (!new RegExp(field.validation_regex).test(value.trim())) {
            errors[field.key] = field.validation_error || `Неверный формат`
          }
        } catch {}
      }
    }

    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'VALIDATION_ERROR', errors })
      return
    }

    dispatch({ type: 'ORDER_CREATING' })
    try {
      const res = await fetch(`${API_BASE}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kozagogo_token') || ''}`,
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          payment_method: 'wallet',
          email: '',
          items: [{
            product_id: product.id,
            service_id: state.selectedServiceId,
            region_id: state.selectedRegionId,
            amount: state.amount,
            quantity: 1,
            inputs: Object.entries(state.inputs).map(([key, value]) => ({
              field_key: key,
              value,
            })),
          }],
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.details) {
          const fieldErrors = {}
          for (const detail of data.error.details) {
            const match = detail.field?.match(/inputs\[(\w+)\]/)
            if (match) fieldErrors[match[1]] = detail.message
          }
          dispatch({ type: 'VALIDATION_ERROR', errors: fieldErrors })
        }
        dispatch({ type: 'ORDER_ERROR', error: data.error?.message || 'Ошибка создания заказа' })
        onError?.(data.error)
        return
      }

      dispatch({ type: 'ORDER_CREATED', order: data })
      onOrderCreated?.(data)
    } catch (err) {
      dispatch({ type: 'ORDER_ERROR', error: err.message })
    }
  }, [currentService, currentRegion, state.amount, state.inputs, product.id])

  return (
    <div className="space-y-6">
      {/* Service Selector */}
      {product.services?.length > 1 && (
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">Услуга</label>
          <div className="flex flex-wrap gap-2">
            {product.services.map(service => (
              <button
                key={service.id}
                onClick={() => dispatch({ type: 'SELECT_SERVICE', serviceId: service.id })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  state.selectedServiceId === service.id
                    ? 'bg-[#7850FF] text-white shadow-lg shadow-[#7850FF]/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-[#7850FF]/30'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Region Selector */}
      {currentService?.regions?.length > 0 && (
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">Регион</label>
          <div className="flex flex-wrap gap-2">
            {currentService.regions.map(region => (
              <button
                key={region.id}
                onClick={() => dispatch({ type: 'SELECT_REGION', regionId: region.id })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  state.selectedRegionId === region.id
                    ? 'bg-[#7850FF]/20 text-[#7850FF] border border-[#7850FF]/40'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-[#7850FF]/30'
                }`}
              >
                {region.flag_url && (
                  <img src={region.flag_url} alt="" className="inline-block w-4 h-3 mr-1.5 rounded-sm" />
                )}
                {region.name}
                {region.currency !== 'RUB' && (
                  <span className="ml-1 text-xs text-gray-500">{region.currency}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Amount / Fixed Amounts */}
      {currentRegion && (
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            Сумма {currentRegion.currency && `(${currentRegion.currency})`}
          </label>
          {currentRegion.fixed_amounts?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {currentRegion.fixed_amounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => dispatch({ type: 'SET_AMOUNT', amount })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    state.amount === amount
                      ? 'bg-[#7850FF] text-white shadow-lg shadow-[#7850FF]/30'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:border-[#7850FF]/30'
                  }`}
                >
                  {formatPrice(amount)}
                </button>
              ))}
            </div>
          ) : (
            <Input
              type="number"
              min={currentRegion.min_amount || 1}
              max={currentRegion.max_amount || 100000}
              placeholder={`от ${formatPrice(currentRegion.min_amount || 1)} до ${formatPrice(currentRegion.max_amount || 100000)}`}
              value={state.amount || ''}
              onChange={e => dispatch({ type: 'SET_AMOUNT', amount: parseFloat(e.target.value) || null })}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          )}
          {currentRegion.instruction && (
            <p className="mt-1 text-xs text-gray-500">{currentRegion.instruction}</p>
          )}
        </div>
      )}

      {/* Dynamic Input Fields */}
      {currentService?.input_fields?.length > 0 && (
        <div className="space-y-4">
          {currentService.input_fields.map(field => (
            <div key={field.key}>
              <label className="text-sm font-medium text-gray-300 mb-1 block">
                {field.label}
                {field.is_required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={state.inputs[field.key] || ''}
                  onChange={e => dispatch({ type: 'SET_INPUT', key: field.key, value: e.target.value })}
                  className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:border-[#7850FF]/50 focus:ring-1 focus:ring-[#7850FF]/30"
                >
                  <option value="" className="bg-[#1a1a2e]">Выберите...</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt} className="bg-[#1a1a2e]">{opt}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type || 'text'}
                  placeholder={field.placeholder || `Введите ${field.label.toLowerCase()}`}
                  maxLength={field.max_length || 255}
                  value={state.inputs[field.key] || ''}
                  onChange={e => dispatch({ type: 'SET_INPUT', key: field.key, value: e.target.value })}
                  className={`bg-white/5 border-white/10 text-white placeholder:text-gray-600 ${
                    state.inputErrors[field.key] ? 'border-red-500' : ''
                  }`}
                />
              )}
              {state.inputErrors[field.key] && (
                <p className="text-xs text-red-400 mt-1">{state.inputErrors[field.key]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Price Display */}
      {state.price && (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">К оплате</span>
            <span className="text-2xl font-bold text-[#7850FF]">
              {formatPrice(state.price.final_price)}
            </span>
          </div>
          {state.price.valid_until && (
            <p className="text-xs text-gray-500 mt-1">
              Цена действительна до {new Date(state.price.valid_until).toLocaleTimeString('ru-RU')}
            </p>
          )}
        </div>
      )}

      {state.priceLoading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Расчёт цены...
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={state.orderCreating || !state.selectedServiceId || !state.selectedRegionId || !state.amount}
        className="w-full h-14 rounded-2xl bg-[#7850FF] hover:bg-[#6340E0] text-white font-semibold text-lg shadow-lg shadow-[#7850FF]/30"
      >
        {state.orderCreating ? (
          <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Обработка...</>
        ) : (
          `Купить${state.price ? ` за ${formatPrice(state.price.final_price)}` : ''}`
        )}
      </Button>

      {state.orderError && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{state.orderError}</span>
          </div>
        </div>
      )}
    </div>
  )
}
