// SberPayButton — официальная кнопка СберПэй (по гайду Сбера)
// Текст: «Оплатите заказ в СберБанк Онлайн»
// Расположение: над другими способами оплаты

interface SberPayButtonProps {
  selected: boolean
  onClick: () => void
}

export default function SberPayButton({ selected, onClick }: SberPayButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-4 rounded-2xl border-2 p-4 transition-all w-full
        ${selected
          ? "border-[#21A038] bg-[#E8F5E9] ring-2 ring-[#21A038]/20"
          : "border-gray-200 bg-white hover:border-[#21A038]/30 hover:shadow-sm"
        }
      `}
    >
      {/* Логотип СберПэй — зелёный круг с "С" */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#21A038] shadow-sm">
        <span className="text-lg font-bold text-white tracking-tight">С</span>
      </div>

      {/* Текстовый блок */}
      <div className="flex flex-col items-start text-left">
        <span className="text-base font-bold text-[#21A038]">СберПэй</span>
        <span className="text-sm text-gray-500 leading-snug">
          Оплатите заказ в СберБанк Онлайн
        </span>
      </div>

      {/* Стрелка */}
      <div className="ml-auto">
        {selected ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#21A038" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>

      {/* Активное состояние — зелёная галочка */}
      {selected && (
        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#21A038] text-white shadow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  )
}
