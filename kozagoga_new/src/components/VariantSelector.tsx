// VariantSelector — выбор варианта товара (срок, регион, объём)
// (SRS CAT-1.14)
// ─────────────────────────────────────────────────────────

import { cn } from "@/lib/utils"

export interface Variant {
  id: string
  name: string
  price: number
  old_price?: number | null
  currency?: string
  validity_days?: number | null
  stock?: number
  description?: string | null
}

interface VariantSelectorProps {
  variants: Variant[]
  selectedId: string | null
  onSelect: (variant: Variant) => void
  formatPrice: (price: number) => string
}

export default function VariantSelector({
  variants,
  selectedId,
  onSelect,
  formatPrice,
}: VariantSelectorProps) {
  if (!variants || variants.length === 0) return null

  return (
    <div className="mb-6">
      <span className="text-sm font-medium mb-3 block">Выберите вариант:</span>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedId
          const isOutOfStock = variant.stock !== undefined && variant.stock === 0

          return (
            <button
              key={variant.id}
              disabled={isOutOfStock}
              onClick={() => onSelect(variant)}
              className={cn(
                "relative flex flex-col items-center rounded-xl border-2 px-4 py-3 text-sm transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-secondary/50",
                isOutOfStock && "opacity-40 cursor-not-allowed line-through"
              )}
            >
              <span className="font-medium">{variant.name}</span>
              <span className="text-xs mt-0.5">
                {formatPrice(variant.price)}
                {variant.old_price && variant.old_price > variant.price && (
                  <span className="ml-1 text-muted-foreground line-through text-[10px]">
                    {formatPrice(variant.old_price)}
                  </span>
                )}
              </span>
              {variant.validity_days && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {variant.validity_days} дн.
                </span>
              )}
              {isOutOfStock && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full">
                  Нет
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
