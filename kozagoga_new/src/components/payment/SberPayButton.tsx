// SberPayButton — зелёная пилюля 🅢 Pay (всегда зелёная)
interface SberPayButtonProps {
  selected: boolean
  onClick: () => void
}

export default function SberPayButton({ selected, onClick }: SberPayButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-[10px] rounded-full py-4 px-5 transition-all ${
        selected
          ? "bg-[#21A038] text-white shadow-md ring-2 ring-[#21A038]/30"
          : "bg-[#21A038]/10 text-[#21A038] border-2 border-[#21A038]/40 hover:bg-[#21A038]/15"
      }`}
    >
      {/* СберПэй лого */}
      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
        selected ? "bg-white/25" : "bg-[#21A038]"
      }`}>
        <span className="text-[11px] font-bold text-white">С</span>
      </div>

      {/* Pay */}
      <span className={`text-[17px] font-bold tracking-wide ${
        selected ? "text-white" : "text-[#21A038]"
      }`}>Pay</span>

      {/* Check */}
      {selected && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}
