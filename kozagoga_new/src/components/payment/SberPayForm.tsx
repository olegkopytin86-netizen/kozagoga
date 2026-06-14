// SberPayForm — кнопка «Оплатить 🅢 Pay» без формы телефона
// СберПэй сам отправляет пуш-уведомление после редиректа на Сбер

interface SberPayFormProps {
  phoneNumber: string
  onPhoneChange: (phone: string) => void
  onSubmit: () => void
  isProcessing: boolean
  total: number
}

export default function SberPayForm({
  phoneNumber,
  onPhoneChange,
  onSubmit,
  isProcessing,
}: SberPayFormProps) {

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (!digits) return ""
    const d = digits[0] === "8" ? "7" + digits.slice(1) : digits
    let formatted = "+7"
    if (d.length > 1) formatted += " " + d.slice(1, 4)
    if (d.length > 4) formatted += " " + d.slice(4, 7)
    if (d.length > 7) formatted += " " + d.slice(7, 9)
    if (d.length > 9) formatted += " " + d.slice(9, 11)
    return formatted
  }

  return (
    <div className="space-y-4">
      {/* Поле телефона (компактное) */}
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2">
        <span className="text-sm text-gray-400 font-medium">+7</span>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneChange(formatPhone(e.target.value))}
          placeholder="987 654-32-10"
          className="flex-1 border-0 bg-transparent py-2 text-base font-medium text-gray-800 outline-none placeholder:text-gray-300"
          maxLength={14}
        />
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        Для отправки пуш-уведомления
      </p>

      {/* Зелёная пилюля Оплатить 🅢 Pay */}
      <button
        onClick={onSubmit}
        disabled={isProcessing}
        style={{ backgroundColor: '#21A038' }}
        className="
          flex w-full items-center justify-center gap-3 rounded-full py-3.5
          text-base font-bold text-white shadow-md transition-all
          hover:brightness-110 hover:shadow-lg active:brightness-90
          disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:brightness-100
        "
      >
        {isProcessing ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
            Обработка...
          </>
        ) : (
          <>
            <span>Оплатить</span>
            <div className="flex items-center gap-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25">
                <span className="text-[10px] font-bold text-white">С</span>
              </div>
              <span className="font-bold tracking-wide">Pay</span>
            </div>
          </>
        )}
      </button>
    </div>
  )
}
