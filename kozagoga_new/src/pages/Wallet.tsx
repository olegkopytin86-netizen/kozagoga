import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Plus, Minus, RefreshCw, CreditCard, History, Wallet as WalletIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"
import { getWalletBalance, getWalletTransactions, walletCredit, type WalletTransaction } from "@/lib/api"

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [topUpError, setTopUpError] = useState("")
  const [topUpSuccess, setTopUpSuccess] = useState(false)

  const fetchData = async () => {
    try {
      const [bal, txs] = await Promise.all([
        getWalletBalance(),
        getWalletTransactions(20),
      ])
      setBalance(Number(bal.balance))
      setTransactions(txs)
    } catch (err: any) {
      console.error("Wallet fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleTopUp = async () => {
    setTopUpError("")
    setTopUpSuccess(false)

    const amount = parseFloat(topUpAmount)
    if (!amount || amount <= 0) {
      setTopUpError("Введите корректную сумму")
      return
    }
    if (amount > 100000) {
      setTopUpError("Максимальная сумма пополнения — 100 000 ₽")
      return
    }

    setTopUpLoading(true)
    try {
      const result = await walletCredit(amount)
      setBalance(Number(result.balance))
      setTopUpAmount("")
      setTopUpSuccess(true)
      setTimeout(() => setTopUpSuccess(false), 3000)
      // Обновляем список транзакций
      const txs = await getWalletTransactions(20)
      setTransactions(txs)
    } catch (err: any) {
      setTopUpError(err.message || "Ошибка пополнения")
    } finally {
      setTopUpLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "credit": return <Plus className="w-4 h-4 text-emerald-500" />
      case "debit": return <Minus className="w-4 h-4 text-red-500" />
      case "refund": return <RefreshCw className="w-4 h-4 text-blue-500" />
      default: return <CreditCard className="w-4 h-4 text-gray-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "credit": return "Пополнение"
      case "debit": return "Списание"
      case "refund": return "Возврат"
      default: return type
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 pb-20">
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 pb-20">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Кошелёк</h1>
            <p className="text-sm text-muted-foreground">Ваш внутренний счёт Kozagogo</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-100 text-sm">Баланс</span>
              <WalletIcon className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-3xl font-bold font-mono">
              {balance !== null ? formatPrice(balance) : "—"}
            </div>
            <p className="text-emerald-200 text-xs mt-1">
              Доступно для оплаты заказов
            </p>
          </CardContent>
        </Card>

        {/* Top Up */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Пополнить кошелёк</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Сумма пополнения"
                value={topUpAmount}
                onChange={(e) => { setTopUpAmount(e.target.value); setTopUpError(""); setTopUpSuccess(false) }}
                min="1"
                max="100000"
              />
              <Button
                onClick={handleTopUp}
                disabled={topUpLoading || !topUpAmount}
                className="shrink-0"
              >
                {topUpLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Пополнить
              </Button>
            </div>
            {topUpError && (
              <p className="text-red-500 text-sm">{topUpError}</p>
            )}
            {topUpSuccess && (
              <p className="text-emerald-600 text-sm">✅ Кошелёк пополнен!</p>
            )}
            <div className="flex gap-2 flex-wrap">
              {[100, 500, 1000, 5000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => { setTopUpAmount(String(amount)); setTopUpError(""); setTopUpSuccess(false) }}
                >
                  +{amount} ₽
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              История операций
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                История операций пуста
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {getTypeIcon(tx.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{getTypeLabel(tx.type)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                        {tx.description && (
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-medium ${
                        tx.type === "credit" ? "text-emerald-600" :
                        tx.type === "refund" ? "text-blue-600" :
                        "text-red-600"
                      }`}>
                        {tx.type === "credit" ? "+" : tx.type === "refund" ? "+" : "-"}
                        {formatPrice(parseFloat(tx.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Баланс: {formatPrice(parseFloat(tx.balance_after))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
