import { useEffect, useState, useCallback } from "react"
import { adminProducts, adminCategories } from "@/lib/admin/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus, Edit, Trash2, Search, AlertCircle, Loader2, Image,
  ChevronLeft, ChevronRight,
} from "lucide-react"

interface Product {
  id: string
  name: string
  slug: string
  description: string
  short_description: string | null
  image_url: string | null
  product_type: string
  category_id: string | null
  category_name: string | null
  provider_code: string | null
  provider_service_id: string | null
  provider_params: any
  price: number
  price_min: number | null
  price_max: number | null
  price_fixed: number | null
  commission_percent: number
  is_active: boolean
  is_popular: boolean
  is_featured: boolean
  requires_precheck: boolean
  exclude_commission: boolean
  meta_title: string | null
  meta_description: string | null
  sort_order: number
  created_at: string
  updated_at: string | null
}

interface Category {
  id: string
  name: string
  parent_id: string | null
  children?: Category[]
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<string | null>(null)

  const emptyForm = {
    name: "", slug: "", description: "", short_description: "", image_url: "",
    product_type: "digital", category_id: "",
    provider_code: "", provider_service_id: "",
    price: 0, price_min: null as number | null, price_max: null as number | null, price_fixed: null as number | null,
    commission_percent: 0,
    is_active: true, is_popular: false, is_featured: false,
    requires_precheck: true, exclude_commission: false,
    meta_title: "", meta_description: "", sort_order: 0,
  }
  const [form, setForm] = useState(emptyForm)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '50' }
      if (search) params.search = search
      if (typeFilter) params.product_type = typeFilter
      if (catFilter) params.category_id = catFilter
      const data = await adminProducts.list(params)
      setProducts((data as any).items || [])
      setTotalPages((data as any).pagination?.total_pages || 1)
      setTotal((data as any).pagination?.total || 0)
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, typeFilter, catFilter])

  const fetchCategories = useCallback(async () => {
    try {
      const data = await adminCategories.list({ include_inactive: 'true' })
      setCategories(data as Category[])
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchCategories() }, [fetchCategories])

  // ─── Flatten categories for select ──────
  const flattenCats = (items: Category[], prefix = ""): { id: string; label: string }[] => {
    const result: { id: string; label: string }[] = []
    for (const item of items) {
      result.push({ id: item.id, label: `${prefix}${item.name}` })
      if (item.children) result.push(...flattenCats(item.children, prefix + "— "))
    }
    return result
  }
  const flatCats = flattenCats(categories)

  // ─── Form helpers ──────────────────────
  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setFormErrors(null)
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditTarget(product)
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      short_description: product.short_description || "",
      image_url: product.image_url || "",
      product_type: product.product_type || "digital",
      category_id: product.category_id || "",
      provider_code: product.provider_code || "",
      provider_service_id: product.provider_service_id || "",
      price: product.price || 0,
      price_min: product.price_min,
      price_max: product.price_max,
      price_fixed: product.price_fixed,
      commission_percent: product.commission_percent || 0,
      is_active: product.is_active,
      is_popular: product.is_popular,
      is_featured: product.is_featured,
      requires_precheck: product.requires_precheck,
      exclude_commission: product.exclude_commission,
      meta_title: product.meta_title || "",
      meta_description: product.meta_description || "",
      sort_order: product.sort_order || 0,
    })
    setFormErrors(null)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить товар «${name}»? (soft delete)`)) return
    try {
      await adminProducts.delete(id)
      fetchProducts()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: prev.slug === generateSlug(prev.name) || !prev.slug ? generateSlug(name) : prev.slug,
    }))
  }

  const handleSave = async () => {
    setFormErrors(null)
    if (!form.name || !form.slug) {
      setFormErrors("Название и slug обязательны")
      return
    }

    setSaving(true)
    try {
      if (editTarget) {
        await adminProducts.update(editTarget.id, form)
      } else {
        await adminProducts.create(form)
      }
      setDialogOpen(false)
      fetchProducts()
    } catch (err: any) {
      setFormErrors(err.message)
    } finally {
      setSaving(false)
    }
  }

  const PRODUCT_TYPES = [
    { value: 'service', label: 'Услуга' },
    { value: 'digital', label: 'Цифровой товар' },
    { value: 'physical', label: 'Физический товар' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Товары</h1>
          <p className="text-sm text-gray-400 mt-1">Всего: {total}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить товар
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-md border border-gray-700 bg-gray-800 py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-gray-600 focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
        >
          <option value="">Все типы</option>
          {PRODUCT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1) }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white max-w-[200px]"
        >
          <option value="">Все категории</option>
          {flatCats.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="border-gray-800 bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium">Категория</th>
                <th className="px-4 py-3 font-medium">Цена</th>
                <th className="px-4 py-3 font-medium">Провайдер</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-500" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                    <PackageIcon className="mx-auto mb-2 h-8 w-8" />
                    <p>Товары не найдены</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-800">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <Image className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{p.name}</p>
                          <p className="text-xs text-gray-500">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {PRODUCT_TYPES.find(t => t.value === p.product_type)?.label || p.product_type}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {p.category_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {p.price_fixed
                        ? `${p.price_fixed} KGS`
                        : p.price_min && p.price_max
                          ? `${p.price_min}–${p.price_max} KGS`
                          : `${p.price} KGS`
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {p.provider_code ? `${p.provider_code} / ${p.provider_service_id || '—'}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.is_active ? "success" : "secondary"} className="text-[10px]">
                        {p.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                      {p.is_popular && (
                        <Badge variant="warning" className="text-[10px] ml-1">Популярный</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-300 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1} className="border-gray-700 text-gray-300">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-400">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages} className="border-gray-700 text-gray-300">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-gray-800 bg-gray-900 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Редактировать товар" : "Добавить товар"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editTarget ? `Редактирование: ${editTarget.name}` : "Создание нового товара или услуги"}
            </DialogDescription>
          </DialogHeader>

          {formErrors && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formErrors}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Название *</Label>
                <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                  className="border-gray-700 bg-gray-800 text-white" placeholder="Valorant — 1000 VP" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))}
                  className="border-gray-700 bg-gray-800 text-white font-mono text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Тип товара</Label>
                <select value={form.product_type} onChange={(e) => setForm(p => ({ ...p, product_type: e.target.value }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
                  {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Категория</Label>
                <select value={form.category_id} onChange={(e) => setForm(p => ({ ...p, category_id: e.target.value }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
                  <option value="">— Нет —</option>
                  {flatCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className="border-gray-700 bg-gray-800 text-white" rows={3} />
            </div>

            {/* Provider (service only) */}
            {form.product_type === 'service' && (
              <div className="rounded-lg border border-gray-700/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Параметры провайдера</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Provider Code</Label>
                    <Input value={form.provider_code} onChange={(e) => setForm(p => ({ ...p, provider_code: e.target.value }))}
                      className="border-gray-700 bg-gray-800 text-white font-mono text-xs" placeholder="hyperion" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Service ID</Label>
                    <Input value={form.provider_service_id} onChange={(e) => setForm(p => ({ ...p, provider_service_id: e.target.value }))}
                      className="border-gray-700 bg-gray-800 text-white font-mono text-xs" placeholder="1039" />
                  </div>
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="rounded-lg border border-gray-700/50 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Ценообразование</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Цена (фикс)</Label>
                  <Input type="number" value={form.price_fixed ?? ''}
                    onChange={(e) => setForm(p => ({ ...p, price_fixed: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="border-gray-700 bg-gray-800 text-white" placeholder="999" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Мин. сумма</Label>
                  <Input type="number" value={form.price_min ?? ''}
                    onChange={(e) => setForm(p => ({ ...p, price_min: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="border-gray-700 bg-gray-800 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Макс. сумма</Label>
                  <Input type="number" value={form.price_max ?? ''}
                    onChange={(e) => setForm(p => ({ ...p, price_max: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="border-gray-700 bg-gray-800 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Комиссия (%)</Label>
                  <Input type="number" step="0.1" value={form.commission_percent}
                    onChange={(e) => setForm(p => ({ ...p, commission_percent: parseFloat(e.target.value) || 0 }))}
                    className="border-gray-700 bg-gray-800 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Порядок</Label>
                  <Input type="number" value={form.sort_order}
                    onChange={(e) => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                    className="border-gray-700 bg-gray-800 text-white" />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'is_active', label: 'Активен' },
                { key: 'is_popular', label: 'Популярный' },
                { key: 'is_featured', label: 'Рекомендуемый' },
                { key: 'requires_precheck', label: 'Требуется пречек' },
                { key: 'exclude_commission', label: 'Без комиссии' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={(form as any)[key]}
                    onCheckedChange={(v) => setForm(p => ({ ...p, [key]: v }))}
                  />
                  <Label className="text-gray-300 cursor-pointer text-sm">{label}</Label>
                </div>
              ))}
            </div>

            {/* SEO */}
            <details className="rounded-lg border border-gray-700/50 p-4">
              <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase">
                SEO (дополнительно)
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-gray-300">Meta Title</Label>
                  <Input value={form.meta_title} onChange={(e) => setForm(p => ({ ...p, meta_title: e.target.value }))}
                    className="border-gray-700 bg-gray-800 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Meta Description</Label>
                  <Textarea value={form.meta_description} onChange={(e) => setForm(p => ({ ...p, meta_description: e.target.value }))}
                    className="border-gray-700 bg-gray-800 text-white" rows={2} />
                </div>
              </div>
            </details>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-700 text-gray-300">
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editTarget ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Inline icon component to avoid import
function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  )
}
