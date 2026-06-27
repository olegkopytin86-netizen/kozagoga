import { useState, useEffect } from "react"
import { Key, Upload, Trash2, Search, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { API_BASE, headers } from "@/lib/api"

interface KeyPoolItem {
  id: string
  product_id: string
  product_name: string
  type: string
  is_sold: boolean
  sold_at: string | null
  hash_prefix: string
  created_at: string
}

interface KeyPoolStats {
  total: number
  available: number
  sold: number
  expired: number
}

export default function AdminKeyPool() {
  const [keys, setKeys] = useState<KeyPoolItem[]>([])
  const [stats, setStats] = useState<KeyPoolStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [productFilter, setProductFilter] = useState("")
  const [csvContent, setCsvContent] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)

  const fetchKeys = async () => {
    setLoading(true)
    try {
      const params = productFilter ? `?product_id=${productFilter}` : ''
      const [keysRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/deliveries/admin/key-pool${params}`, { headers: headers() }),
        fetch(`${API_BASE}/api/deliveries/admin/key-pool/stats${params}`, { headers: headers() }),
      ])
      if (keysRes.ok) setKeys(await keysRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchKeys() }, [])

  const handleUpload = async () => {
    if (!csvContent.trim() || !productFilter) return
    setUploading(true)
    setUploadResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/deliveries/admin/key-pool/upload`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productFilter, csv: csvContent }),
      })
      setUploadResult(await res.json())
      if (res.ok) fetchKeys()
    } catch {}
    setUploading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить ключ?')) return
    await fetch(`${API_BASE}/api/deliveries/admin/key-pool/${id}`, {
      method: 'DELETE', headers: headers(),
    })
    fetchKeys()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6" /> Управление ключами
        </h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={fetchKeys}>
          <RefreshCw className="h-4 w-4" /> Обновить
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Всего</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{stats.available}</p><p className="text-xs text-muted-foreground">Доступно</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{stats.sold}</p><p className="text-xs text-muted-foreground">Продано</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{stats.expired}</p><p className="text-xs text-muted-foreground">Просрочено</p></CardContent></Card>
        </div>
      )}

      {/* Upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">Загрузка ключей</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="ID товара (UUID)" value={productFilter} onChange={e => setProductFilter(e.target.value)} />
          <textarea
            className="w-full h-24 rounded-lg border bg-secondary/30 p-2 text-xs font-mono"
            placeholder={`CSV формат:\nvalue,type,meta\nKEY-AAAA-BBBB,key,{}`}
            value={csvContent} onChange={e => setCsvContent(e.target.value)}
          />
          <Button onClick={handleUpload} disabled={uploading || !productFilter || !csvContent.trim()} className="gap-1">
            <Upload className="h-4 w-4" /> {uploading ? "Загрузка..." : "Загрузить"}
          </Button>
          {uploadResult && (
            <pre className="text-xs bg-secondary/30 p-2 rounded">{JSON.stringify(uploadResult, null, 2)}</pre>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ключи ({keys.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 animate-pulse bg-secondary rounded-lg" />
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs">{k.hash_prefix}...</span>
                    <Badge variant={k.is_sold ? "secondary" : "default"} className="text-[10px]">
                      {k.is_sold ? "Продан" : "Доступен"}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">{k.product_name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(k.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
