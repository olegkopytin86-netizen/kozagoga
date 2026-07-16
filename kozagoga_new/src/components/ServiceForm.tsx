// ServiceForm — динамическая форма для товаров-услуг (провайдеры)
//
// Flow:
// 1. Нажать Pay → processPayment → register.do (Сбер)
// 2. Цепочка диплинков (?dlStep=N, reload между шагами — clearMessage)
//    - Если приложение открылось (blur) → ?paymentConfirm=ORDER_ID → режим ожидания
//    - Если все 6 шагов пройдены без blur → "Проверьте приложение" + режим ожидания
// 3. Режим ожидания: polling /api/confirm-status/:orderId
// 4. Оба (Sber + Hyperion) подтверждены → Успех
// 5. Таймаут из конфига (confirmation_timeout_sec) → главная

import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Loader2, CheckCircle, XCircle, AlertCircle, Zap, Clock, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { getServices, validateRequisite, createOrder, processPayment, type ServiceField } from "@/lib/api"
import { initiateSberPay, checkSberPayStep } from "@/lib/sberpay"
import SberPayButton from "@/components/payment/SberPayButton"

type PaymentMethod = "sberpay" | "sbp" | "card" | "wallet"

interface Props {
  product: {
    id: string
    name: string
    price: number
    provider_code: string
    provider_service_id: string
  }
}

interface ServiceInfo {
  fields: ServiceField[]
  min_amount: number
  max_amount: number
}

const POLL_INTERVAL_MS = 2000

export default function ServiceForm({ product }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [amount, setAmount] = useState(String(product.price))
  const [validationResult, setValidationResult] = useState<{ result: string; details: string; possible: boolean } | null>(null)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wallet")

  // Состояние оплаты
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting' | 'success' | 'timeout' | 'no_app'>('idle')
  const [remainingSec, setRemainingSec] = useState(10)
  const [timeoutSec, setTimeoutSec] = useState(10)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadServiceInfo()
    fetchTimeoutConfig()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const fetchTimeoutConfig = async () => {
    try {
      const res = await fetch('/api/config/payment')
      if (res.ok) {
        const cfg = await res.json()
        setTimeoutSec(cfg.confirmation_timeout_sec || 10)
      }
    } catch { /* default 10 */ }
  }

  // ─── При возврате с ?paymentConfirm=ORDER_ID ──────────
  useEffect(() => {
    const confirmId = searchParams.get('paymentConfirm')
    if (!confirmId) return
    setOrderId(confirmId)
    startWaiting(confirmId)
  }, [searchParams])

  // ─── SberPay: проверка шага при загрузке страницы ───
  useEffect(() => {
    checkSberPayStep()
  }, [])

  // ─── Совместимость со старой цепочкой (?dlStep) ───
  useEffect(() => {
    const dlStep = searchParams.get('dlStep')
    if (dlStep !== null) {
      const savedRaw = sessionStorage.getItem('sber_deeplinks')
      if (savedRaw) {
        const saved = JSON.parse(savedRaw)
        if (saved.deepLinks?.length > 0) {
          initiateSberPay(saved.deepLinks)
        }
      }
      const url = new URL(window.location.href)
      url.searchParams.delete('dlStep')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  const loadServiceInfo = async () => {
    try {
      const services = await getServices()
      const svc = services.find(s => s.id === product.provider_service_id)
      if (svc) {
        setServiceInfo({
          fields: svc.fields,
          min_amount: svc.min_amount,
          max_amount: svc.max_amount,
        })
        const initial: Record<string, string> = {}
        svc.fields.forEach(f => { initial[f.key] = "" })
        setFieldValues(initial)
      }
    } catch (err: any) {
      console.error("Load service error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getMainField = () => serviceInfo?.fields.find(f => f.is_main_requisite)
  const getMainValue = () => {
    const main = getMainField()
    return main ? fieldValues[main.key] || "" : ""
  }

  const handleValidate = async () => {
    setValidating(true)
    setError("")
    setValidationResult(null)
    const mainField = getMainField()
    if (!mainField) return
    const requisite = getMainValue()
    if (!requisite || requisite.length < (mainField.min_length || 1)) {
      setError(`Минимальная длина: ${mainField.min_length} символов`)
      setValidating(false)
      return
    }
    if (mainField.mask) {
      const regex = new RegExp(mainField.mask)
      if (!regex.test(requisite)) { setError("Некорректный формат"); setValidating(false); return }
    }
    try {
      const result = await validateRequisite(product.id, requisite, fieldValues)
      setValidationResult(result)
    } catch (err: any) {
      setError(err.message || "Ошибка валидации")
    } finally { setValidating(false) }
  }

  // ─── Ожидание + polling ──────────────────────────────
  const startWaiting = (oid: string) => {
    const deadline = Date.now() + timeoutSec * 1000
    setRemainingSec(timeoutSec)

    const timerTick = setInterval(() => {
      setRemainingSec(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    }, 1000)

    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current!)
      clearInterval(timerTick)
      setPaymentStatus('timeout')
      setTimeout(() => navigate('/'), 2000)
    }, timeoutSec * 1000)

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/confirm-status/${oid}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.confirmed) {
          clearInterval(pollRef.current!)
          clearTimeout(timeoutRef.current!)
          clearInterval(timerTick)
          setPaymentStatus('success')
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL_MS)
  }

  // ─── Автовалидация + оплата ──────────────────────────
  const handlePay = async () => {
    if (!user) { navigate("/login"); return }
    const requisite = getMainValue()
    const mainField = getMainField()
    if (!mainField || !requisite) { setError('Введите номер телефона'); return }

    if (!validationResult?.possible) {
      setValidating(true)
      setError('')
      try {
        const result = await validateRequisite(product.id, requisite, fieldValues)
        setValidationResult(result)
        if (!result.possible) {
          setError(result.details.replace(/^Code: [^;]+; \d+: /, ''))
          setValidating(false)
          return
        }
      } catch (err: any) {
        setError(err.message || 'Ошибка валидации')
        setValidating(false)
        return
      }
      setValidating(false)
    }

    setError("")

    try {
      const order = await createOrder([{ product_id: product.id, quantity: 1 }], paymentMethod)
      setOrderId(order.id)
      const payment = await processPayment(order.id, paymentMethod)

      // Wallet — без ожидания
      if (!payment.redirect_url && payment.status === 'succeeded') {
        navigate(`/orders/${order.id}`)
        return
      }

      // Mobile — перебор диплинков по спецификации SberPay mWeb2app
      if (payment.deep_links && payment.deep_links.length > 0) {
        const ua = navigator.userAgent
        if (/iPhone|iPad|iPod/i.test(ua) || /Android/i.test(ua)) {
          // Сохраняем orderId для обработки после возврата
          sessionStorage.setItem('sberpay_service_orderId', order.id)
          // Запускаем перебор фиксированных схем из документации
          initiateSberPay(payment.deep_links)
          return
        }
      }

      // Desktop — сразу ожидание
      startWaiting(order.id)
      setPaymentStatus('waiting')
    } catch (err: any) {
      setError(err.message || "Ошибка оплаты")
    }
  }

  const mainField = getMainField()

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  if (!serviceInfo) {
    return <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">Сервис временно недоступен</div>
  }

  // ─── Режим ожидания ──────────────────────────────────
  if (paymentStatus === 'waiting') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <Clock className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold">Ожидание подтверждения оплаты</p>
          <p className="text-sm text-muted-foreground mt-1">Платёж обрабатывается</p>
          <p className="text-xs text-muted-foreground mt-2">Осталось: {remainingSec} сек.</p>
        </div>
        <div className="w-48 h-1.5 bg-secondary rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000"
            style={{ width: `${(remainingSec / timeoutSec) * 100}%` }} />
        </div>
      </div>
    )
  }

  // ─── Приложение не открылось ─────────────────────────
  if (paymentStatus === 'no_app') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-800">Проверьте наличие приложения</p>
          <p className="text-sm text-muted-foreground mt-1">
            Не удалось открыть приложение Сбера. Убедитесь, что СберБанк Онлайн установлен и обновлён.
          </p>
          <p className="text-xs text-muted-foreground mt-2">Ожидание подтверждения... {remainingSec} сек.</p>
        </div>
        <div className="w-48 h-1.5 bg-secondary rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-1000"
            style={{ width: `${(remainingSec / timeoutSec) * 100}%` }} />
        </div>
      </div>
    )
  }

  // ─── Успех ───────────────────────────────────────────
  if (paymentStatus === 'success') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold text-emerald-700">Успех!</p>
          <p className="text-sm text-muted-foreground mt-1">Платёж подтверждён. Услуга будет оказана в ближайшее время.</p>
        </div>
        {orderId && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/orders/${orderId}`)}>
            Перейти к заказу
          </Button>
        )}
      </div>
    )
  }

  // ─── Таймаут ─────────────────────────────────────────
  if (paymentStatus === 'timeout') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-700">Время ожидания истекло</p>
          <p className="text-sm text-muted-foreground mt-1">Перенаправляем на главную...</p>
        </div>
      </div>
    )
  }

  // ─── Форма ───────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {serviceInfo.fields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              placeholder={field.is_main_requisite ? "4439971010560410" : field.label}
              value={fieldValues[field.key] || ""}
              onChange={(e) => {
                setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))
                setValidationResult(null)
              }}
              maxLength={field.is_main_requisite ? undefined : field.max_length}
              className={field.keyboard === "numeric" ? "font-mono text-lg" : ""}
              inputMode={field.keyboard === "numeric" ? "numeric" : "text"}
            />
            {field.mask && <p className="text-xs text-muted-foreground mt-1">Формат: {field.mask}</p>}
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="amount">Сумма пополнения (сом)</Label>
        <Input id="amount" type="number" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={serviceInfo.min_amount} max={serviceInfo.max_amount} />
        <p className="text-xs text-muted-foreground mt-1">от {serviceInfo.min_amount} до {serviceInfo.max_amount} сом</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {validationResult && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${validationResult.possible ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
          {validationResult.possible ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{validationResult.details.replace(/^Code: [^;]+; \d+: /, '')}</span>
        </div>
      )}

      <div>
        <Label className="mb-2 block text-sm">Способ оплаты</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SberPayButton selected={paymentMethod === "sberpay"} onClick={() => setPaymentMethod("sberpay")} />
          <button onClick={() => setPaymentMethod("sbp")}
            className={`rounded-xl border p-3 text-left transition-all text-sm ${paymentMethod === "sbp" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/30"}`}>
            <div className="mb-1">
              <img src="/assets/sbp_button.png" alt="СБП" className="h-8 w-auto" />
            </div>
            <div className="text-xs font-medium">СБП</div>
            <div className="text-[10px] text-muted-foreground">Система быстрых платежей</div>
          </button>
          <button onClick={() => setPaymentMethod("card")}
            className={`rounded-xl border p-3 text-left transition-all text-sm ${paymentMethod === "card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/30"}`}>
            <div className="mb-1 text-xl">💳</div>
            <div className="text-xs font-medium">Банковская карта</div>
            <div className="text-[10px] text-muted-foreground">Visa, Mastercard, Мир</div>
          </button>
          <button onClick={() => setPaymentMethod("wallet")}
            className={`rounded-xl border p-3 text-left transition-all text-sm ${paymentMethod === "wallet" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/30"}`}>
            <div className="mb-1 text-xl">👛</div>
            <div className="text-xs font-medium">Кошелёк</div>
            <div className="text-[10px] text-muted-foreground">Внутренний счёт</div>
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleValidate}
          disabled={validating || !getMainValue()}>
          {validating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Проверка...</> : "Проверить"}
        </Button>

        {paymentMethod === "sberpay" ? (
          <button onClick={handlePay}
            disabled={!amount || parseFloat(amount) < serviceInfo.min_amount}
            className="w-full block overflow-hidden rounded-lg border-none bg-transparent p-0 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src="/assets/sberpay_gradient_a2657e8d.png"
              alt="SberPay"
              className="w-full h-auto"
            />
          </button>
        ) : (
          <Button className="flex-1 gap-2" onClick={handlePay}
            disabled={!amount || parseFloat(amount) < serviceInfo.min_amount}>
            <><Zap className="w-4 h-4" /> Оплатить {formatPrice(parseFloat(amount))}</>
          </Button>
        )}
      </div>

      {!user && (
        <p className="text-xs text-center text-muted-foreground">
          Для оплаты необходимо <button onClick={() => navigate("/login")} className="text-primary underline">войти</button>
        </p>
      )}
    </div>
  )
}
