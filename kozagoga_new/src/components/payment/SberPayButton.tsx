// PayButton — платёжная кнопка 1:1 с макетом
// Градиент зелёный→бирюзовый, иконка галочки, текст Pay

interface PayButtonProps {
  selected: boolean
  onClick: () => void
}

export default function PayButton({ selected, onClick }: PayButtonProps) {
  const gradient = 'linear-gradient(90deg, #4EEA2F 0%, #20D6B6 55%, #19C7D9 100%)'

  return (
    <button
      onClick={onClick}
      className={`
        relative flex w-full items-center justify-center gap-[10px]
        rounded-full py-[15px] px-[24px]
        font-bold text-white text-[17px] tracking-wide leading-none
        transition-all duration-200 ease-out cursor-pointer select-none
        disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none
        ${selected
          ? 'shadow-[0_12px_30px_rgba(32,214,182,0.35)] hover:shadow-[0_16px_40px_rgba(32,214,182,0.50)]'
          : 'shadow-none hover:shadow-[0_12px_30px_rgba(32,214,182,0.20)]'
        }
        hover:-translate-y-[1.5px]
        active:scale-[0.98]
      `}
      style={{
        background: selected ? gradient : 'transparent',
        border: selected ? 'none' : '2px solid rgba(78, 234, 47, 0.35)',
      }}
    >
      {/* Gradient overlay for unselected state */}
      {!selected && (
        <div
          className="absolute inset-0 rounded-full opacity-[0.08] hover:opacity-[0.14] transition-opacity"
          style={{ background: gradient, pointerEvents: 'none' }}
        />
      )}

      {/* Checkmark in circle */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 26 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <circle
          cx="13"
          cy="13"
          r="12"
          fill={selected ? 'rgba(255,255,255,0.25)' : '#4EEA2F'}
          stroke={selected ? 'white' : 'none'}
          strokeWidth={selected ? '1.5' : '0'}
        />
        <path
          d="M8 13.5L11.5 17L18 10"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Pay */}
      <span>Pay</span>
    </button>
  )
}
