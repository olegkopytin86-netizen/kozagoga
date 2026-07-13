// QrDisplay — отображение QR-кода для оплаты через мобильное устройство
// Сценарий: десктоп → QR → пользователь сканирует телефоном

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Smartphone, Copy, Check } from 'lucide-react'

interface QrDisplayProps {
  /** URL для кодирования в QR */
  payload: string
  /** ID заказа для поллинга статуса */
  orderId: string
  /** Текст заголовка */
  title?: string
  /** Текст инструкции */
  instruction?: string
  onCancel: () => void
  onSuccess: () => void
}

export default function QrDisplay({
  payload,
  orderId,
  title = 'Оплата через СберПэй',
  instruction = 'Отсканируйте QR-код камерой телефона или через приложение СберБанк',
  onCancel,
  onSuccess,
}: QrDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Генерируем QR-код
  useEffect(() => {
    if (!canvasRef.current) return

    QRCode.toCanvas(canvasRef.current, payload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    }, (err) => {
      if (err) {
        console.error('[QrDisplay] QR generation error:', err)
        setError('Не удалось сгенерировать QR-код')
      }
    })

    // Также генерируем data URL для fallback
    QRCode.toDataURL(payload, { width: 280, margin: 2 })
      .then(url => setQrDataUrl(url))
      .catch(() => {})

    // Поллинг статуса заказа
    const token = localStorage.getItem('kozagogo_token')
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const order = await res.json()
          if (order.payment_status === 'paid' || order.status === 'paid') {
            clearInterval(pollRef.current!)
            onSuccess()
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [payload, orderId, onSuccess])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <CardContent className="flex flex-col items-center p-8 text-center">
          {/* Иконка */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
            <Smartphone className="h-7 w-7 text-violet-600" />
          </div>

          <h2 className="mb-1 text-xl font-bold">{title}</h2>
          <p className="mb-6 text-sm text-muted-foreground">{instruction}</p>

          {/* QR-код */}
          <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm">
            <canvas ref={canvasRef} className="mx-auto" />
          </div>

          {/* Кнопка копирования ссылки */}
          <button
            onClick={handleCopy}
            className="mb-4 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5 text-emerald-500" /> Скопировано</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Копировать ссылку</>
            )}
          </button>

          {/* Индикатор ожидания */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ожидаем оплату...
          </div>

          {error && (
            <div className="mb-4 w-full rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Кнопка отмены */}
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Отменить
          </Button>

          <p className="mt-3 text-xs text-muted-foreground">
            Не закрывайте страницу до завершения оплаты
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
