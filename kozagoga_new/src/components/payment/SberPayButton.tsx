// SberPayButton — фирменная кнопка оплаты СберПэй
// Стилизована под официальный брендбук Сбера

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
          ? "border-[#21A038] bg-[#21A038]/5 ring-2 ring-[#21A038]/30 shadow-md"
          : "border-gray-200 hover:border-[#21A038]/40 hover:shadow-sm"
        }
      `}
    >
      {/* Иконка СберПэй (SVG) */}
      <div className="mb-2 flex items-center gap-1.5">
        {/* Логотип — зелёный круг с "С" */}
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="18" fill="#21A038" />
          <text
            x="18"
            y="18"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="20"
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
          >
            С
          </text>
        </svg>
        {/* Текст СберПэй */}
        <span className="text-base font-bold tracking-tight" style={{ color: '#21A038' }}>
          СберПэй
        </span>
      </div>

      {/* Описание */}
      <span className="text-xs text-gray-500 text-center leading-tight">
        Оплата одним касанием в <br />СберБанк Онлайн
      </span>
    </button>
  )
}
