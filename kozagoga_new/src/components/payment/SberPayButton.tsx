// SberPayButton — пилюля «Оплатить 🅢 Pay» (Google Pay-стиль)
interface SberPayButtonProps {
  selected: boolean
  onClick: () => void
}

export default function SberPayButton({ selected, onClick }: SberPayButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: '#21A038' }}
      className={`
        relative flex w-full items-center justify-center gap-3 rounded-full py-4
        text-white font-bold shadow-md transition-all
        hover:brightness-110 hover:shadow-lg active:brightness-90
        ${selected ? "ring-2 ring-[#21A038]/40" : ""}
      `}
    >
      {/* Лого: круг с С */}
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
        <span className="text-xs font-bold text-white">С</span>
      </div>

      <span className="text-lg tracking-tight">Оплатить</span>

      {/* Pay */}
      <span className="text-lg font-bold tracking-wide">Pay</span>
    </button>
  )
}
