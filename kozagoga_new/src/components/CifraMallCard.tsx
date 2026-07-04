import { useState } from "react"
import { cn } from "@/lib/utils"

/* ============================================================
 * CifraMall — Premium Digital Product Card
 * 
 * For: игровые пополнения, подарочные карты, подписки, сервисы
 * Style: Apple glassmorphism × Gaming marketplace premium
 * Stack: React 19 + TypeScript + Tailwind CSS v4
 * 
 * Layers: Background → Ambient Glow → Image → Fade → Content
 * ============================================================ */

interface CifraMallCardProps {
  /** Product image URL */
  imageUrl: string
  /** Product title (e.g. "Steam Gift Card") */
  title: string
  /** Short description (e.g. "Пополнение баланса Steam") */
  subtitle: string
  /** Price label (e.g. "от 500 ₽", "1 290 ₽") */
  price: string
  /** Optional click handler */
  onClick?: () => void
  /** Extra Tailwind classes */
  className?: string
  /** Width override (default: 800px, use 100% for grid) */
  width?: string
}

export default function CifraMallCard({
  imageUrl,
  title,
  subtitle,
  price,
  onClick,
  className,
  width = "800px",
}: CifraMallCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Товар: ${title}. Цена: ${price}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.()
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        // ── Card shell ──
        "relative overflow-hidden cursor-pointer select-none",
        "rounded-[32px] p-[40px] max-sm:p-[24px]",

        // ── Premium dark gradient ──
        "bg-gradient-to-br from-[#0D0D12] via-[#1A1A24] via-[30%] via-[#12121C] to-[#0A0A0F]",

        // ── Glass border ──
        "border border-[rgba(255,255,255,0.06)]",

        // ── Glow ──
        "shadow-[0_0_80px_rgba(120,80,255,0.08)_0_0_160px_rgba(120,80,255,0.04)_inset_0_1px_0_rgba(255,255,255,0.06)]",

        // ── Animation ──
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",

        // ── Hover ──
        hovered && "scale-[1.03]",

        className,
      )}
      style={{ width, maxWidth: "100%" }}
    >
      {/* ─── Layer 1: Ambient Glow ─── */}
      <div
        className={cn(
          "absolute w-[60%] h-[50%] top-[15%] left-1/2 -translate-x-1/2",
          "pointer-events-none",
          "transition-all duration-300 ease-out",
          hovered ? "opacity-100 scale-110" : "opacity-80 scale-100",
        )}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(120,80,255,0.15) 0%, rgba(120,80,255,0.05) 40%, transparent 70%)",
        }}
      />

      {/* ─── Layer 2: Product Image ─── */}
      <img
        src={imageUrl}
        alt={title}
        draggable={false}
        className={cn(
          "relative z-[2] w-[72%] max-w-[560px] mx-auto",
          "object-contain block",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          hovered && "-translate-y-[10px]",
        )}
        style={{
          filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))",
          // preserve original PNG — no color shifts, no processing
          imageRendering: "auto",
          mixBlendMode: "normal",
        }}
      />

      {/* ─── Layer 3: Fade Overlay ─── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-[3]"
        style={{
          height: "55%",
          background:
            "linear-gradient(to top, rgba(13,13,18,1) 0%, rgba(13,13,18,0.9) 20%, rgba(13,13,18,0.4) 50%, transparent 100%)",
        }}
      />

      {/* ─── Layer 4: Content ─── */}
      <div className="relative z-[4] mt-[24px] flex flex-col items-start">
        {/* Title */}
        <h2
          className={cn(
            "font-['SF_Pro_Display',-apple-system,BlinkMacSystemFont,'Segoe_UI',system-ui,sans-serif]",
            "font-semibold text-[32px] max-sm:text-[24px] leading-[1.15] -tracking-[0.02em]",
            "text-white m-0",
          )}
        >
          {title}
        </h2>

        {/* Subtitle */}
        <p
          className={cn(
            "font-['SF_Pro_Text',-apple-system,BlinkMacSystemFont,'Segoe_UI',system-ui,sans-serif]",
            "font-normal text-base leading-[1.4] tracking-normal",
            "text-[#A0A0A0] mt-[8px] m-0",
          )}
        >
          {subtitle}
        </p>

        {/* Price Badge */}
        <div
          className={cn(
            "inline-flex items-center justify-center",
            "px-[24px] py-[10px] mt-[20px]",
            "rounded-[100px]",
            "backdrop-blur-[16px]",
            "border border-[rgba(120,80,255,0.2)]",
            "font-['SF_Pro_Display',system-ui,sans-serif]",
            "font-semibold text-[20px] max-sm:text-base",
            "-tracking-[0.01em] text-white",
            "select-none",
          )}
          style={{ background: "rgba(120, 80, 255, 0.12)" }}
        >
          {price}
        </div>

        {/* Brand Watermark */}
        <div
          className={cn(
            "w-full text-center mt-[32px]",
            "font-['SF_Pro_Display',system-ui,sans-serif]",
            "font-medium text-[13px] tracking-[0.3em] uppercase",
            "text-[rgba(255,255,255,0.2)]",
            "select-none pointer-events-none",
          )}
        >
          CIFRAMALL
        </div>
      </div>
    </div>
  )
}
