// SberPayButton — официальная кнопка СберПэй в стиле Сбера
// Формат: белая/светлая плашка с логотипом СберПэй, зелёной галочкой при выборе

interface SberPayButtonProps {
  selected: boolean
  onClick: () => void
}

export default function SberPayButton({ selected, onClick }: SberPayButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center rounded-xl border-2 p-4 text-left transition-all
        ${selected
          ? "border-[#21A038] bg-[#E8F5E9] ring-2 ring-[#21A038]/20"
          : "border-gray-200 bg-white hover:border-[#21A038]/30 hover:shadow-sm"
        }
      `}
    >
      {/* Логотип СберПэй — зелёный круг с "С" + текст */}
      <div className="mb-2 flex items-center gap-2">
        {/* Зелёный круг с "С" */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#21A038] shadow-sm">
          <span className="text-sm font-bold text-white">С</span>
        </div>
        {/* Надпись СберПэй фирменным шрифтом/цветом */}
        <div className="flex flex-col items-start leading-tight">
          <span className="text-base font-bold tracking-tight text-[#21A038]">СберПэй</span>
          <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">SberPay</span>
        </div>
      </div>

      {/* Описание */}
      <span className="text-xs text-gray-500 text-center leading-snug">
        Платите онлайн через<br />СберБанк Онлайн
      </span>

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
