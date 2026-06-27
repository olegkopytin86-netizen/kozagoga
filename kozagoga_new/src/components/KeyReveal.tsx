// KeyReveal — анимированное открытие ключа с copy-to-clipboard
// (SRS DD-1.11)
// ─────────────────────────────────────────────────────────

import { useState } from "react"
import { Eye, EyeOff, Copy, Check, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface KeyRevealProps {
  orderItemId: string
  maxReveals?: number
  revealCount?: number
  onReveal?: (value: string) => void
}

export default function KeyReveal({ orderItemId, maxReveals = 3, revealCount = 0, onReveal }: KeyRevealProps) {
  const [keyValue, setKeyValue] = useState<string | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [localRevealCount, setLocalRevealCount] = useState(revealCount)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showKey, setShowKey] = useState(false)

  const remainingReveals = maxReveals - localRevealCount
  const canReveal = remainingReveals > 0

  const handleReveal = async () => {
    if (!canReveal || loading) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/deliveries/${orderItemId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка')
      }

      const data = await res.json()
      setKeyValue(data.value)
      setIsRevealed(true)
      setLocalRevealCount(c => c + 1)
      setShowKey(true)
      onReveal?.(data.value)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!keyValue) return
    try {
      await navigator.clipboard.writeText(keyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = keyValue
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Заголовок */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Key className="h-4 w-4" />
        <span>Ключ активации</span>
        {isRevealed && (
          <span className="text-xs text-muted-foreground ml-auto">
            Показано {localRevealCount} из {maxReveals}
          </span>
        )}
      </div>

      {/* Значение ключа */}
      {isRevealed && keyValue ? (
        <div className="relative">
          <div className={cn(
            "flex items-center justify-between rounded-lg border bg-secondary/50 px-4 py-3 font-mono text-sm",
            !showKey && "blur-sm select-none"
          )}>
            <span>{keyValue}</span>
            <div className="flex gap-1 ml-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Скрыть" : "Показать"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopy}
                title="Копировать"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {!showKey && (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
              Ключ скрыт
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleReveal}
            disabled={!canReveal || loading}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {canReveal ? "Показать ключ" : `Лимит показов исчерпан`}
          </Button>
          {remainingReveals > 0 && remainingReveals < maxReveals && (
            <span className="text-xs text-muted-foreground">
              Осталось показов: {remainingReveals}
            </span>
          )}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Copy confirmation */}
      {copied && (
        <p className="text-xs text-emerald-600 animate-in fade-in">
          Скопировано!
        </p>
      )}
    </div>
  )
}
