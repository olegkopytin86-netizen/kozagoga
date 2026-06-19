import { useEffect, useState, useCallback } from "react"
import { useAdminAuth } from "@/contexts/AdminAuthContext"
import { adminTransactions } from "@/lib/admin/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Search, RefreshCw, Download, XCircle, Undo2, CheckCircle2,
  AlertCircle, Loader2, Copy, ChevronLeft, ChevronRight,
} from "lucide-react"

interface Transaction {
  order_id: string
  order_status: string
  total: number
  payment_status: string
  payment_method: string | null
  created_at: string
  user_id: string
  user_email: string | null
  transaction_id: string | null
  provider_code: string | null
  provider_status: string | null
  provider_transaction_id: string | null
  gateway_tx_id: string | null
  gateway_code: string | null
  amount: number | null
  currency: string | null
  commission: number | null
  refund_amount: number | null
  cancelled_by: string | null
  cancelled_at: string | null
  refunded_by: string | null
  refunded_at: string | null
}

interface TransactionDetail extends Transaction {
  admin_actions?: { action: string; admin_id: string; details: any; created_at: string }[]
}

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "danger" | "secondary" | "default"; label: string }> = {
  completed: { variant: "success", label: "Завершён" },
  COMPLETE: { variant: "success", label: "COMPLETE" },
  paid: { variant: "success", label: "Оплачен" },
  processing: { variant: "warning", label: "В обработке" },
  INPROGRESS: { variant: "warning", label: "INPROGRESS" },
  pending: { variant: "secondary", label: "Ожидает" },
  PENDING: { variant: "secondary", label: "PENDING" },
  cancelled: { variant: "danger", label: "Отменён" },
  CANCELLED: { variant: "danger", label: "CANCELLED" },
  failed: { variant: "danger", label: "Ошибка" },
  FAILURE: { variant: "danger", label: "FAILURE" },
  refunded: { variant: "danger", label: "Возврат" },
}

function getStatusBadge(status: string | null) {
  return STATUS_BADGE[status || ''] || { variant: "secondary" as const, label: status || '—' }
}

export default function AdminTransactions() {
  const { admin } = useAdminAuth()
  const canAct = admin && ['operator', 'admin', 'superadmin'].includes(admin.role)
  const canForceComplete = admin && ['admin', 'superadmin'].includes(admin.role)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TransactionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '50' }
      if (search) params.search = search
      if (statusFilter) {
        if (['pending','paid','processing','completed','cancelled'].includes(statusFilter)) {
          params.order_status = statusFilter
        } else {
          params.provider_status = statusFilter
        }
      }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const data = await adminTransactions.list(params)
      setTransactions((data as any).items || [])
      setTotalPages((data as any).pagination?.total_pages || 1)
      setTotal((data as any).pagination?.total || 0)
    } catch (err: any) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, dateFrom, dateTo])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // ─── Detail ──────────────────────────────────
  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetailLoading(true)
    setActionError(null)
    try {
      const data = await adminTransactions.get(id)
      setDetail(data as TransactionDetail)
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  // ─── Actions ─────────────────────────────────
  const handleCancel = async (id: string) => {
    setActionLoading(id)
    setActionError(null)
    try {
      await adminTransactions.cancel(id)
      fetchTransactions()
      if (detailId === id) openDetail(id)
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefund = async (id: string) => {
    setActionLoading(id)
    setActionError(null)
    try {
      await adminTransactions.refund(id)
      fetchTransactions()
      if (detailId === id) openDetail(id)
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleForceComplete = async (id: string) => {
    if (!confirm('Принудительно завершить заказ? Это действие необратимо.')) return
    setActionLoading(id)
    setActionError(null)
    try {
      await adminTransactions.forceComplete(id)
      fetchTransactions()
      if (detailId === id) openDetail(id)
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    })
  }

  const formatAmount = (amount: number | null) => {
    if (amount == null) return '—'
    return new Intl.NumberFormat("ru-RU").format(amount)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Операции</h1>
          <p className="text-sm text-gray-400 mt-1">Всего: {total}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTransactions} className="border-gray-700 text-gray-300">
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
          <Button variant="outline" size="sm" className="border-gray-700 text-gray-300" asChild>
            <a href={adminTransactions.exportCsv()} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </a>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Поиск по ID, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full rounded-md border border-gray-700 bg-gray-800 py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-gray-600 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="">Все статусы</option>
              <optgroup label="Заказ">
                <option value="pending">Ожидает</option>
                <option value="paid">Оплачен</option>
                <option value="processing">В обработке</option>
                <option value="completed">Завершён</option>
                <option value="cancelled">Отменён</option>
              </optgroup>
              <optgroup label="Провайдер">
                <option value="PENDING">PENDING</option>
                <option value="INPROGRESS">INPROGRESS</option>
                <option value="COMPLETE">COMPLETE</option>
                <option value="FAILURE">FAILURE</option>
                <option value="CANCELLED">CANCELLED</option>
              </optgroup>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-gray-800 bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Дата/время</th>
                <th className="px-4 py-3 font-medium">ID заказа</th>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium">Статус заказа</th>
                <th className="px-4 py-3 font-medium">Провайдер</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                    <p>Операции не найдены</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const sb = getStatusBadge(tx.order_status)
                  const psb = tx.provider_status ? getStatusBadge(tx.provider_status) : null
                  return (
                    <tr
                      key={tx.order_id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                      onClick={() => openDetail(tx.order_id)}
                    >
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">
                        {tx.order_id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[120px] truncate">
                        {tx.user_email || tx.user_id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {formatAmount(tx.total)} {tx.currency || 'KGS'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={sb.variant} className="text-[10px]">
                          {sb.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {tx.provider_code || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {psb ? (
                          <Badge variant={psb.variant} className="text-[10px]">
                            {psb.label}
                          </Badge>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {canAct && ['pending', 'paid', 'processing'].includes(tx.order_status) && (
                            <button
                              onClick={() => handleCancel(tx.order_id)}
                              disabled={actionLoading === tx.order_id}
                              className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Отменить"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {canAct && ['paid', 'completed'].includes(tx.order_status) && (
                            <button
                              onClick={() => handleRefund(tx.order_id)}
                              disabled={actionLoading === tx.order_id}
                              className="rounded p-1 text-gray-500 hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                              title="Возврат"
                            >
                              <Undo2 className="h-4 w-4" />
                            </button>
                          )}
                          {canForceComplete && ['pending', 'processing', 'paid'].includes(tx.order_status) && (
                            <button
                              onClick={() => handleForceComplete(tx.order_id)}
                              disabled={actionLoading === tx.order_id}
                              className="rounded p-1 text-gray-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                              title="Принудительно завершить"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border-gray-700 text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-400">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border-gray-700 text-gray-300"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) { setDetailId(null); setDetail(null) } }}>
        <DialogContent className="border-gray-800 bg-gray-900 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали операции</DialogTitle>
            <DialogDescription className="text-gray-400">
              ID: {detailId}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-gray-500">Сумма</p>
                  <p className="text-lg font-bold">{formatAmount(detail.total)} {detail.currency || 'KGS'}</p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-gray-500">Клиент</p>
                  <p className="text-sm truncate">{detail.user_email || detail.user_id}</p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-gray-500">Статус заказа</p>
                  <Badge variant={getStatusBadge(detail.order_status).variant}>{detail.order_status}</Badge>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-gray-500">Статус провайдера</p>
                  {detail.provider_status ? (
                    <Badge variant={getStatusBadge(detail.provider_status).variant}>{detail.provider_status}</Badge>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </div>
              </div>

              {/* IDs */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Идентификаторы</h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'Order ID', value: detail.order_id },
                    { label: 'Transaction ID', value: detail.transaction_id },
                    { label: 'Provider TX ID', value: detail.provider_transaction_id },
                    { label: 'Gateway TX ID', value: detail.gateway_tx_id },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="flex items-center justify-between rounded bg-gray-800/30 px-3 py-1.5">
                      <span className="text-xs text-gray-500">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-300">{value}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(value!)}
                          className="text-gray-600 hover:text-gray-300"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Admin actions history */}
              {detail.admin_actions && detail.admin_actions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">История изменений</h4>
                  <div className="space-y-1">
                    {detail.admin_actions.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded bg-gray-800/30 px-3 py-2 text-xs">
                        <Badge variant="outline" className="text-[10px] border-gray-700">{a.action}</Badge>
                        <span className="text-gray-400">{new Date(a.created_at).toLocaleString('ru-RU')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="gap-2">
                {canAct && ['pending', 'paid', 'processing'].includes(detail.order_status) && (
                  <Button
                    variant="destructive" size="sm"
                    onClick={() => handleCancel(detail.order_id)}
                    disabled={actionLoading === detail.order_id}
                  >
                    {actionLoading === detail.order_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Отменить
                  </Button>
                )}
                {canAct && ['paid', 'completed'].includes(detail.order_status) && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleRefund(detail.order_id)}
                    disabled={actionLoading === detail.order_id}
                    className="border-amber-700 text-amber-400 hover:bg-amber-500/10"
                  >
                    {actionLoading === detail.order_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                    Возврат
                  </Button>
                )}
                {canForceComplete && ['pending', 'processing', 'paid'].includes(detail.order_status) && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleForceComplete(detail.order_id)}
                    disabled={actionLoading === detail.order_id}
                    className="border-emerald-700 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    {actionLoading === detail.order_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Force Complete
                  </Button>
                )}
              </DialogFooter>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <AlertCircle className="mx-auto mb-2 h-8 w-8" />
              <p>Не удалось загрузить детали</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
