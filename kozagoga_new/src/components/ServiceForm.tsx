// ServiceForm — динамическая форма для товаров-услуг (провайдеры)
// Показывает поля ввода, кнопку "Проверить", сумму, оплату

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, CheckCircle, XCircle, AlertCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { getServices, validateRequisite, createOrder, processPayment, type ServiceField } from "@/lib/api"

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

export default function ServiceForm({ product }: Props) {
  const { addItem } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [amount, setAmount] = useState(String(product.price))
  const [validationResult, setValidationResult] = useState<{ result: string; details: string; possible: boolean } | null>(null)
  const [validating, setValidating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadServiceInfo()
  }, [])

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
        // Инициализируем поля
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

    // Проверка по маске
    if (mainField.mask) {
      const regex = new RegExp(mainField.mask)
      if (!regex.test(requisite)) {
        setError("Некорректный формат")
        setValidating(false)
        return
      }
    }

    try {
      const result = await validateRequisite(product.id, requisite, fieldValues)
      setValidationResult(result)
    } catch (err: any) {
      setError(err.message || "Ошибка валидации")
    } finally {
      setValidating(false)
    }
  }

  const handlePay = async () => {
    if (!user) {
      navigate("/login")
      return
    }

    setPaying(true)
    setError("")

    try {
      // Создаём заказ
      const order = await createOrder(
        [{ product_id: product.id, quantity: 1 }],
        "wallet"
      )

      // Платим с кошелька
      const payment = await processPayment(order.id, "wallet")

      if (payment.redirect_url) {
        window.location.href = payment.redirect_url
      } else {
        // Успех — на страницу заказа
        navigate(`/orders/${order.id}`)
      }
    } catch (err: any) {
      setError(err.message || "Ошибка оплаты")
    } finally {
      setPaying(false)
    }
  }

  const isReady = validationResult?.possible === true
  const mainField = getMainField()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!serviceInfo) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
        Сервис временно недоступен
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Поля услуги */}
      <div className="space-y-3">
        {serviceInfo.fields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              placeholder={field.is_main_requisite ? "996555333333" : field.label}
              value={fieldValues[field.key] || ""}
              onChange={(e) => {
                setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))
                setValidationResult(null)
              }}
              maxLength={field.is_main_requisite ? undefined : field.max_length}
              className={field.keyboard === "numeric" ? "font-mono text-lg" : ""}
              inputMode={field.keyboard === "numeric" ? "numeric" : "text"}
              disabled={paying}
            />
            {field.mask && (
              <p className="text-xs text-muted-foreground mt-1">
                Формат: {field.mask}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Сумма */}
      <div>
        <Label htmlFor="amount">Сумма пополнения (сом)</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={serviceInfo.min_amount}
          max={serviceInfo.max_amount}
          disabled={paying}
        />
        <p className="text-xs text-muted-foreground mt-1">
          от {serviceInfo.min_amount} до {serviceInfo.max_amount} сом
        </p>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Результат валидации */}
      {validationResult && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
          validationResult.possible
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
            : "bg-red-50 border border-red-200 text-red-600"
        }`}>
          {validationResult.possible
            ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          }
          <span>{validationResult.details.replace(/^Code: [^;]+; \d+: /, '')}</span>
        </div>
      )}

      {/* Кнопки */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleValidate}
          disabled={validating || !getMainValue() || paying}
        >
          {validating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Проверка...</>
          ) : (
            "Проверить"
          )}
        </Button>

        <Button
          className="flex-1 gap-2"
          onClick={handlePay}
          disabled={!isReady || paying || !amount || parseFloat(amount) < serviceInfo.min_amount}
        >
          {paying ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Оплата...</>
          ) : (
            <><Zap className="w-4 h-4" /> Оплатить {formatPrice(parseFloat(amount))}</>
          )}
        </Button>
      </div>

      {!user && (
        <p className="text-xs text-center text-muted-foreground">
          Для оплаты необходимо <button onClick={() => navigate("/login")} className="text-primary underline">войти</button>
        </p>
      )}
    </div>
  )
}
