// CouponInput — поле ввода промокода с кнопкой "Применить"
// (SRS CART-3.17)
// ─────────────────────────────────────────────────────────

import { useState } from "react"
import { Tag, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { API_BASE, headers } from "@/lib/api"

interface CouponInputProps {
  onApply?: (discount: number) => void
  onRemove?: () => void
  appliedCode?: string | null
  discountAmount?: number
}

export default function CouponInput({ onApply, onRemove, appliedCode, discountAmount }: CouponInputProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleApply = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`${API_BASE}/api/cart/coupon`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ code: code.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка')
      }

      const data = await res.json()
      onApply?.(data.discount_amount)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    try {
      await fetch(`${API_BASE}/api/cart/coupon`, {
        method: 'DELETE',
        headers: headers(),
      })
      onRemove?.()
      setCode("")
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">{appliedCode}</span>
          {discountAmount ? (
            <span className="text-sm text-emerald-600">−{discountAmount} ₽</span>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRemove} disabled={loading}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Введите промокод"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError("") }}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleApply} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Применить"}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
