// PayButton — кнопка выбора SberPay в сетке способов оплаты
// Стилизована под общий дизайн с СБП и Картами (compact-версия)

interface PayButtonProps {
  selected: boolean
  onClick: () => void
}

export default function PayButton({ selected, onClick }: PayButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'hover:border-primary/30'
      }`}
    >
      <div className="mb-1">
        <img
          src="/assets/sberpay_btn.png?v=2"
          alt="SberPay"
          className="h-10 w-auto"
        />
      </div>
      <div className="text-sm font-medium">СберПэй</div>
      <div className="text-xs text-muted-foreground">Оплата через СберБанк</div>
    </button>
  )
}
