// SberPayForm — упрощённая форма: номер телефона (опционально) + кнопка «Оплатить 🅢 Pay»

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

  return (
    <div className="mt-3 space-y-4">
      {/* Поле телефона */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-600">
          Номер телефона для получения уведомления
        </span>
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="+7 987 654-32-10"
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-[#21A038] focus:ring-2 focus:ring-[#21A038]/20"
          maxLength={18}
        />
      </label>

      {/* Фирменная кнопка Оплатить 🅢 Pay */}
      <button
        onClick={onSubmit}
        disabled={isProcessing}
        className="
          flex w-full items-center justify-center gap-3 rounded-full bg-[#21A038] py-4
          text-lg font-bold text-white shadow-sm transition-all
          hover:bg-[#1B8A2F] hover:shadow-lg active:bg-[#157326] active:shadow-sm
          disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none
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
            <span className="tracking-tight">Оплатить</span>
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
                <span className="text-[11px] font-bold text-white">С</span>
              </div>
              <span className="text-[17px] font-bold tracking-wide">Pay</span>
            </div>
          </>
        )}
      </button>
    </div>
  )
}
