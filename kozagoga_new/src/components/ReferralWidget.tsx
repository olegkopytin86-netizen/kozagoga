// ReferralWidget — блок реферальной программы в профиле
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Users, Copy, Check, Share2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getReferralInfo, type ReferralInfo } from "@/lib/referral-api"

export default function ReferralWidget() {
  const [info, setInfo] = useState<ReferralInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReferralInfo().then(setInfo).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleCopy = async () => {
    if (!info?.code) return
    await navigator.clipboard.writeText(info.referral_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-20 animate-pulse bg-secondary rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (!info) return null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Реферальная программа</p>
            <p className="font-semibold">Приглашайте друзей и получайте бонусы</p>
          </div>
          <Users className="h-5 w-5 text-primary" />
        </div>

        <div className="flex gap-2 mb-4">
          <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-mono text-center">
            {info.code}
          </code>
          <Button size="sm" variant="outline" className="gap-1" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Скопировано" : "Код"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-lg font-bold">{info.referral_count}</p>
            <p className="text-xs text-muted-foreground">Приглашено</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-lg font-bold">{info.total_earned} ₽</p>
            <p className="text-xs text-muted-foreground">Заработано</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
