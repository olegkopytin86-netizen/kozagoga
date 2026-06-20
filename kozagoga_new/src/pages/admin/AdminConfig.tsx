import { useEffect, useState } from "react"
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
  Settings,
  Save,
  RotateCcw,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react"

interface ConfigSection {
  key: string
  label: string
  description: string
  fields: { key: string; type: string; description: string }[]
}

interface ConfigData {
  sections: ConfigSection[]
  raw_yaml: string
  config_path: string
}

export default function AdminConfig() {
  const { admin } = useAdminAuth()
  const [configData, setConfigData] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [reloaded, setReloaded] = useState(false)
  const [rawMode, setRawMode] = useState(false)
  const [rawContent, setRawContent] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const data = await adminApi.get<ConfigData>('/config')
      setConfigData(data)
      setRawContent(data.raw_yaml)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки конфигурации')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  // Сохранение raw YAML
  const handleSaveRaw = async () => {
    setSaving(true)
    setError("")
    try {
      await adminApi.put('/config/raw', { content: rawContent })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  // Hot-reload
  const handleReload = async () => {
    setReloading(true)
    setReloaded(false)
    try {
      const result = await adminApi.post('/config/reload')
      setReloaded(true)
      setTimeout(() => setReloaded(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Ошибка перезагрузки')
    } finally {
      setReloading(false)
    }
  }

  const toggleSection = (key: string) => {
    const next = new Set(expandedSections)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpandedSections(next)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const isSuperAdmin = admin?.role === 'superadmin'

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Конфигурация</h1>
          <p className="text-sm text-gray-400 mt-1">
            Настройка бизнес-процессов и интеграций
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <>
              <Button
                variant={rawMode ? "default" : "outline"}
                size="sm"
                onClick={() => setRawMode(!rawMode)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                {rawMode ? "Структура" : "YAML"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReload}
                disabled={reloading}
                className="gap-2"
              >
                <RotateCcw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} />
                {reloading ? "Загрузка..." : "Reload"}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/50 p-4 text-sm text-red-300 border border-red-800">
          {error}
        </div>
      )}

      {reloaded && (
        <div className="mb-4 rounded-lg bg-emerald-900/50 p-4 text-sm text-emerald-300 border border-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Конфигурация перезагружена
        </div>
      )}

      {/* Raw YAML mode (superadmin only) */}
      {rawMode && isSuperAdmin ? (
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <FileText className="h-4 w-4" />
              integrations.yaml
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono text-gray-400">
                {configData?.config_path || '—'}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400"
                onClick={() => copyToClipboard(rawContent)}
                title="Копировать"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-[500px] bg-gray-950 text-gray-300 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary resize-y"
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              spellCheck={false}
            />
            <div className="mt-4 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {saved && <span className="text-emerald-400">✅ Сохранено</span>}
              </p>
              <Button onClick={handleSaveRaw} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Сохранение...' : 'Сохранить YAML'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Structured view */
        <div className="space-y-4">
          {configData?.sections.map((section) => (
            <Card key={section.key} className="border-gray-800 bg-gray-900">
              <button
                className="w-full text-left"
                onClick={() => toggleSection(section.key)}
              >
                <CardHeader className="flex flex-row items-center justify-between hover:bg-gray-800/50 transition-colors rounded-t-lg">
                  <div>
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      {expandedSections.has(section.key) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      {section.label}
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">{section.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs text-gray-400 font-mono">
                    {section.key}
                  </Badge>
                </CardHeader>
              </button>

              {expandedSections.has(section.key) && (
                <CardContent>
                  <Separator className="mb-4 border-gray-800" />
                  <div className="space-y-3">
                    {section.fields.map((field) => (
                      <div key={field.key} className="flex items-start justify-between py-1">
                        <div>
                          <p className="text-sm text-gray-300 font-mono">{field.key}</p>
                          <p className="text-xs text-gray-500">{field.description}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs font-mono bg-gray-800 text-gray-400"
                        >
                          {field.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Информация о файле */}
          {configData?.config_path && (
            <div className="text-center text-xs text-gray-600 mt-4">
              Файл: {configData.config_path}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
