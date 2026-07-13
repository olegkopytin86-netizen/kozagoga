// PaymentButton — адаптивная кнопка оплаты
// Автоматический выбор wide/compact в зависимости от ширины контейнера
// Wide: 600×120 (5:1) — для ProductCard, ProductDetail, ProductModal, широких блоков
// Compact: 220×64 (220:64) — для Checkout, ServiceForm, узких колонок

import { useRef, useState, useEffect } from 'react'

type ButtonType = 'sberpay' | 'sbp'
type ButtonVariant = 'wide' | 'compact'

interface PaymentButtonProps {
  type: ButtonType
  onClick: () => void
  disabled?: boolean
  processing?: boolean
  /** Принудительная версия. Если не указана — определяется по ширине контейнера */
  variant?: ButtonVariant
  /** Дополнительные CSS-классы */
  className?: string
}

const ASSETS: Record<ButtonType, Record<ButtonVariant, string>> = {
  sberpay: {
    wide: '/assets/sberpay_wide.svg',
    compact: '/assets/sberpay_compact.svg',
  },
  sbp: {
    wide: '/assets/sbp_wide.svg',
    compact: '/assets/sbp_compact.svg',
  },
}

const BREAKPOINT = 280 // px — минимальная ширина для wide-версии

const VARIANTS: Record<ButtonVariant, string> = {
  wide: 'payment-btn--wide',
  compact: 'payment-btn--compact',
}

export default function PaymentButton({
  type,
  onClick,
  disabled = false,
  processing = false,
  variant: forcedVariant,
  className = '',
}: PaymentButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [variant, setVariant] = useState<ButtonVariant>(forcedVariant || 'compact')

  useEffect(() => {
    if (forcedVariant) {
      setVariant(forcedVariant)
      return
    }

    const checkWidth = () => {
      if (ref.current) {
        const w = ref.current.offsetWidth
        setVariant(w >= BREAKPOINT ? 'wide' : 'compact')
      }
    }

    checkWidth()

    const observer = new ResizeObserver(checkWidth)
    if (ref.current) observer.observe(ref.current)

    return () => observer.disconnect()
  }, [forcedVariant])

  const src = ASSETS[type][variant]

  return (
    <div ref={ref} className={`payment-btn-wrapper ${VARIANTS[variant]} ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || processing}
        className="payment-btn"
      >
        {processing ? (
          <div className="payment-btn-loading">
            <svg className="payment-btn-spinner" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <img
            src={src}
            alt={type === 'sberpay' ? 'SberPay' : 'СБП'}
            className="payment-btn-img"
            loading="eager"
          />
        )}
      </button>
    </div>
  )
}
