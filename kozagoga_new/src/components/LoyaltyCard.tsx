// LoyaltyCard — уровень лояльности и прогресс до следующего
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react"
import { Award, TrendingUp, Gift, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getLoyaltyInfo, type LoyaltyInfo } from "@/lib/loyalty-api"
import { formatPrice } from "@/lib/utils"

const levelColors: Record<string, string> = {
  bronze: "bg-amber-600",
  silver: "bg-slate-400",
  gold: "bg-yellow-500",
  platinum: "bg-cyan-400",
}

const levelIcons: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
}

export default function LoyaltyCard() {
  const [info, setInfo] = useState<LoyaltyInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLoyaltyInfo().then(setInfo).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-24 animate-pulse bg-secondary rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (!info) return null

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Ваш уровень</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{levelIcons[info.level.code] || "🏅"}</span>
              <span className="text-xl font-bold">{info.level.name}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono">{formatPrice(info.total_spent)}</p>
            <p className="text-xs text-muted-foreground">Всего потрачено</p>
          </div>
        </div>

        {info.next_level && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">До уровня {info.next_level.name}</span>
              <span className="font-medium">{formatPrice(info.spent_to_next)}</span>
            </div>
            <Progress value={info.progress * 100} className="h-2" />
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-xs text-muted-foreground">Кешбэк</p>
            <p className="font-bold">{info.level.cashback_rate}%</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-xs text-muted-foreground">Скидка</p>
            <p className="font-bold">{info.level.discount_percent}%</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-xs text-muted-foreground">Доставка</p>
            <p className="font-bold">{info.level.free_delivery ? "Бесплатно" : "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
