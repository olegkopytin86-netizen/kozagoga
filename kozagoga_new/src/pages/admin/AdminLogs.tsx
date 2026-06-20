import { useEffect, useState, useCallback } from "react"
import { useAdminAuth } from "@/contexts/AdminAuthContext"
import { adminApi } from "@/lib/admin/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  X,
  List,
  Activity,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LogEntry {
  id: number
  level: string
  component: string
  message: string
  details: any
  request_id: string | null
  user_id: string | null
  user_email: string | null
  ip: string | null
  duration_ms: number | null
  created_at: string
}

interface LogStats {
  totals: { total: number; errors: number; warnings: number; oldest: string; newest: string }
  by_level: { level: string; count: number }[]
  by_component: { component: string; count: number }[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

const LEVEL_COLORS: Record<string, string> = {
  error: "bg-red-500",
  warn: "bg-amber-500",
  info: "bg-blue-500",
  debug: "bg-gray-500",
  fatal: "bg-red-700",
}

const LEVEL_LABELS: Record<string, string> = {
  error: "Ошибка",
  warn: "Предупреждение",
  info: "Информация",
  debug: "Отладка",
  fatal: "Критическая",
}

const LEVEL_ICONS: Record<string, typeof AlertCircle> = {
  error: AlertCircle,
  warn: AlertTriangle,
  info: Info,
  debug: Bug,
  fatal: AlertCircle,
}

// Tab: system | admin
type LogTab = "system" | "admin"

export default function AdminLogs() {
  const { admin } = useAdminAuth()
  const [tab, setTab] = useState<LogTab>("system")

  // Filters
  const [level, setLevel] = useState("")
  const [component, setComponent] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Data
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<LogStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  const isSuperAdmin = admin?.role === 'superadmin'

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: "50",
      }
      if (level) params.level = level
      if (component) params.component = component
      if (search) params.search = search
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const endpoint = tab === "system" ? '/logs' : '/logs/admin'
      const data = await adminApi.get<{ items: LogEntry[]; pagination: Pagination }>(endpoint, params)
      setLogs(data.items)
      setPagination(data.pagination)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки логов')
    } finally {
      setLoading(false)
    }
  }, [tab, level, component, search, dateFrom, dateTo, page])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const params: Record<string, string> = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const data = await adminApi.get<LogStats>('/logs/stats', params)
      setStats(data)
    } catch {
      // Non-critical
    } finally {
      setStatsLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (tab === "system") {
      fetchStats()
    }
  }, [tab, fetchStats])

  const handleReset = () => {
    setLevel("")
    setComponent("")
    setSearch("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const LevelIcon = (level: string) => {
    const Icon = LEVEL_ICONS[level] || Info
    return <Icon className={`h-3.5 w-3.5 ${level === 'error' || level === 'fatal' ? 'text-red-400' : level === 'warn' ? 'text-amber-400' : 'text-gray-400'}`} />
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Логи</h1>
          <p className="text-sm text-gray-400 mt-1">
            Системные логи и аудит действий администраторов
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 ${showFilters ? 'border-primary text-primary' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Фильтры
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchLogs(); if (tab === "system") fetchStats() }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Tabs: System | Admin */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "system"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => { setTab("system"); setPage(1); setSelectedLog(null) }}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          Системные логи
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "admin"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => { setTab("admin"); setPage(1); setSelectedLog(null) }}
        >
          <List className="h-4 w-4 inline mr-2" />
          Аудит админов
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6 border-gray-800 bg-gray-900">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Уровень</Label>
                <Select value={level} onValueChange={(v) => { setLevel(v); setPage(1) }}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                    <SelectValue placeholder="Все уровни" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">Все уровни</SelectItem>
                    <SelectItem value="error,fatal">Ошибки</SelectItem>
                    <SelectItem value="warn">Предупреждения</SelectItem>
                    <SelectItem value="info">Информация</SelectItem>
                    <SelectItem value="debug">Отладка</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tab === "system" && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Компонент</Label>
                  <Input
                    placeholder="server, auth, payment..."
                    value={component}
                    onChange={(e) => { setComponent(e.target.value); setPage(1) }}
                    className="bg-gray-800 border-gray-700 text-gray-300"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Поиск</Label>
                <Input
                  placeholder="ID, email, сообщение..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-400">От</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-400">До</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-gray-400 gap-1">
                <X className="h-3 w-3" />
                Сбросить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats bar (system logs only) */}
      {tab === "system" && !statsLoading && stats && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full">
            <FileText className="h-3 w-3" />
            Всего: <span className="text-white font-medium">{stats.totals.total}</span>
          </div>
          {stats.totals.errors > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-400 bg-red-900/20 px-3 py-1.5 rounded-full">
              <AlertCircle className="h-3 w-3" />
              Ошибок: <span className="text-red-300 font-medium">{stats.totals.errors}</span>
            </div>
          )}
          {stats.totals.warnings > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-900/20 px-3 py-1.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              Предупреждений: <span className="text-amber-300 font-medium">{stats.totals.warnings}</span>
            </div>
          )}
          {stats.totals.oldest && (
            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800/50 px-3 py-1.5 rounded-full">
              <Clock className="h-3 w-3" />
              {new Date(stats.totals.newest).toLocaleDateString("ru-RU")}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/50 p-4 text-sm text-red-300 border border-red-800">
          {error}
        </div>
      )}

      {/* Log detail view */}
      {selectedLog ? (
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Детали записи #{selectedLog.id}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)} className="text-gray-400">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Уровень</p>
                <Badge className={`mt-1 ${LEVEL_COLORS[selectedLog.level] || 'bg-gray-500'}`}>
                  {LEVEL_LABELS[selectedLog.level] || selectedLog.level}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Компонент</p>
                <p className="text-sm text-gray-300 font-mono mt-1">{selectedLog.component}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Дата</p>
                <p className="text-sm text-gray-300 mt-1">{formatDate(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Request ID</p>
                <p className="text-sm text-gray-300 font-mono mt-1">{selectedLog.request_id || '—'}</p>
              </div>
              {selectedLog.user_email && (
                <div>
                  <p className="text-xs text-gray-500">Пользователь</p>
                  <p className="text-sm text-gray-300 mt-1">{selectedLog.user_email}</p>
                </div>
              )}
              {selectedLog.ip && (
                <div>
                  <p className="text-xs text-gray-500">IP</p>
                  <p className="text-sm text-gray-300 font-mono mt-1">{selectedLog.ip}</p>
                </div>
              )}
              {selectedLog.duration_ms !== null && (
                <div>
                  <p className="text-xs text-gray-500">Длительность</p>
                  <p className="text-sm text-gray-300 font-mono mt-1">{selectedLog.duration_ms}ms</p>
                </div>
              )}
            </div>

            <Separator className="border-gray-800" />

            <div>
              <p className="text-xs text-gray-500 mb-2">Сообщение</p>
              <div className="bg-gray-950 rounded-lg p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap break-all">
                {selectedLog.message}
              </div>
            </div>

            {selectedLog.details && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Детали (JSON)</p>
                <pre className="bg-gray-950 rounded-lg p-4 text-sm text-gray-300 font-mono overflow-x-auto max-h-96">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Logs list */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="border-gray-800 bg-gray-900">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 bg-gray-800" />
                    <Skeleton className="h-3 w-1/4 bg-gray-800 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-1">
              {logs.map((log) => (
                <button
                  key={log.id}
                  className="w-full text-left"
                  onClick={() => setSelectedLog(log)}
                >
                  <Card className="border-gray-800 bg-gray-900 hover:bg-gray-800/50 transition-colors cursor-pointer">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {LevelIcon(log.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${LEVEL_COLORS[log.level] || 'bg-gray-500'} text-[10px] px-1.5 py-0`}>
                            {LEVEL_LABELS[log.level] || log.level}
                          </Badge>
                          <span className="text-xs font-mono text-gray-500">{log.component}</span>
                          {log.duration_ms !== null && (
                            <span className="text-[10px] text-gray-600">{log.duration_ms}ms</span>
                          )}
                          {log.user_email && (
                            <span className="text-[10px] text-gray-600">{log.user_email}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 mt-1 truncate">{log.message}</p>
                        <p className="text-[10px] text-gray-600 mt-1">{formatDate(log.created_at)}</p>
                      </div>
                      {log.details && (
                        <Eye className="h-3.5 w-3.5 text-gray-600 shrink-0 mt-1" />
                      )}
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Логов не найдено</h3>
              <p className="text-sm text-gray-500">Попробуйте изменить параметры фильтрации</p>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Страница {pagination.page} из {pagination.total_pages}
                {' · '}
                {pagination.total} записей
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.total_pages}
                  onClick={() => setPage(p => p + 1)}
                  className="gap-1"
                >
                  Вперёд
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
