// SberPayButton — пилюля «🅢 Pay» (Apple Pay / Google Pay стиль)
interface SberPayButtonProps {
  selected: boolean
  onClick: () => void
}

export default function SberPayButton({ selected, onClick }: SberPayButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: selected ? '#21A038' : undefined }}
      className={`relative flex w-full items-center gap-3 rounded-full py-3.5 px-6 transition-all ${
        selected
          ? "text-white shadow-md ring-2 ring-[#21A038]/30"
          : "bg-white text-gray-700 border-2 border-gray-200 hover:border-[#21A038]/40 hover:shadow-sm"
      }`}
    >
      {/* Зелёный круг с "С" */}
      <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
        selected ? "bg-white/25" : "bg-[#21A038]"
      }`}>
        <span className="text-sm font-bold text-white">С</span>
      </div>

      {/* Pay */}
      <span className={`text-lg font-bold tracking-wide ${
        selected ? "text-white" : "text-[#21A038]"
      }`}>Pay</span>

      {/* Галочка */}
      <div className="ml-auto">
        {selected ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </button>
  )
}
