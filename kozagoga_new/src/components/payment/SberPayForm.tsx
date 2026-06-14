// SberPayForm — форма оплаты по номеру телефона (по гайду Сбера)
// Показывается при выборе СберПэй в чекауте

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
  total
}: SberPayFormProps) {

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (!digits) return ""
    if (digits[0] === "7" || digits[0] === "8") {
      const d = digits[0] === "8" ? "7" + digits.slice(1) : digits
      let formatted = "+7"
      if (d.length > 1) formatted += " " + d.slice(1, 4)
      if (d.length > 4) formatted += " " + d.slice(4, 7)
      if (d.length > 7) formatted += " " + d.slice(7, 9)
      if (d.length > 9) formatted += " " + d.slice(9, 11)
      return formatted
    }
    return "+" + digits
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPhoneChange(formatPhone(e.target.value))
  }

  const isValidPhone = phoneNumber.replace(/\D/g, "").length === 11

  return (
    <div className="border border-[#21A038]/20 rounded-xl bg-[#F0FAF0] p-4 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#21A038]">
          <span className="text-xs font-bold text-white">С</span>
        </div>
        <span className="font-semibold text-[#21A038]">СберПэй</span>
      </div>

      {/* Инструкция */}
      <p className="text-sm text-gray-600 leading-snug">
        Для оплаты отправим пуш-уведомление на номер телефона
      </p>

      {/* Поле ввода телефона */}
      <div className="relative">
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="+7 987 654-32-10"
          className="w-full rounded-xl border-2 border-[#21A038]/30 bg-white px-4 py-3 text-base font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-[#21A038] focus:ring-2 focus:ring-[#21A038]/20"
          maxLength={18}
        />
        {isValidPhone && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#21A038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Кнопка оплаты — зелёная пилюля «Оплатить 🅢 Рау» */}
      <button
        onClick={onSubmit}
        disabled={isProcessing || !isValidPhone}
        className={`
          flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-lg font-bold text-white shadow-sm transition-all
          ${isProcessing || !isValidPhone
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-[#21A038] hover:bg-[#1B8A2F] active:bg-[#157326] hover:shadow-lg active:shadow-sm"
          }
        `}
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
            <span className="tracking-tight">Оплатить</span>
            {/* SberPay logo — зелёный круг с «С» + Рау */}
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
                <span className="text-xs font-bold text-white">С</span>
              </div>
              <span className="text-base font-bold tracking-wide">Pay</span>
            </div>
          </>
        )}
      </button>

      {/* Примечание */}
      <p className="text-xs text-gray-500 text-center leading-snug">
        Не пришло уведомление? Нажмите на карточку оплаты счета над Кошельком в приложении Сбербанка
      </p>
    </div>
  )
}
