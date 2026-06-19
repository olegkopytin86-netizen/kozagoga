import { useEffect, useState, useCallback } from "react"
import { adminCategories } from "@/lib/admin/api"
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
  DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import {
  Plus, Edit, Trash2, ChevronRight, ChevronDown, Folder,
  Search, AlertCircle, Loader2,
} from "lucide-react"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  icon: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  children?: Category[]
}

const ICON_PRESETS = ['📱', '💻', '💡', '🔌', '📺', '🏠', '🎮', '🎁', '💰', '⚡', '📱', '📷', '🎵', '📚', '🛒']

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Form state
  const [form, setForm] = useState({
    name: "", slug: "", description: "", parent_id: "" as string | null,
    icon: "", sort_order: 0, is_active: true,
  })

  const [formErrors, setFormErrors] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const data = await adminCategories.list({ include_inactive: 'true' })
      setCategories(data as Category[])
    } catch (err: any) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // ─── Flat list for select ─────────────────────
  const flattenCategories = (items: Category[], prefix = ""): { id: string; label: string }[] => {
    const result: { id: string; label: string }[] = []
    for (const item of items) {
      result.push({ id: item.id, label: `${prefix}${item.name}` })
      if (item.children) {
        result.push(...flattenCategories(item.children, prefix + "— "))
      }
    }
    return result
  }

  const flatList = flattenCategories(categories)

  // ─── Filter by search ─────────────────────────
  const filterTree = (items: Category[]): Category[] => {
    if (!search) return items
    return items.filter(item => {
      const matches = item.name.toLowerCase().includes(search.toLowerCase())
      const childrenMatch = item.children ? filterTree(item.children).length > 0 : false
      return matches || childrenMatch
    }).map(item => ({
      ...item,
      children: item.children ? filterTree(item.children) : [],
    }))
  }

  const filtered = filterTree(categories)

  // ─── Tree renderer ────────────────────────────
  const renderTree = (items: Category[], depth = 0) => {
    return items.map(cat => (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-800/50 transition-colors group ${
            depth > 0 ? "ml-6" : ""
          }`}
        >
          <button
            onClick={() => {
              const next = new Set(expanded)
              if (next.has(cat.id)) next.delete(cat.id)
              else next.add(cat.id)
              setExpanded(next)
            }}
            className="text-gray-500 hover:text-gray-300"
          >
            {cat.children && cat.children.length > 0 ? (
              expanded.has(cat.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <span className="w-4 inline-block" />
            )}
          </button>

          <span className="text-lg">{cat.icon || '📁'}</span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{cat.name}</p>
            <p className="text-xs text-gray-500">/{cat.slug}</p>
          </div>

          <Badge variant={cat.is_active ? "success" : "secondary"} className="text-[10px]">
            {cat.is_active ? "Активна" : "Скрыта"}
          </Badge>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => confirmDelete(cat)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <span className="text-xs text-gray-600 w-6 text-right">{cat.sort_order}</span>
        </div>

        {cat.children && cat.children.length > 0 && expanded.has(cat.id) && (
          <div className="border-l border-gray-800 ml-5">
            {renderTree(cat.children, depth + 1)}
          </div>
        )}
      </div>
    ))
  }

  // ─── Form helpers ────────────────────────────
  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: "", slug: "", description: "", parent_id: null, icon: "", sort_order: 0, is_active: true })
    setFormErrors(null)
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditTarget(cat)
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      parent_id: cat.parent_id,
      icon: cat.icon || "",
      sort_order: cat.sort_order || 0,
      is_active: cat.is_active,
    })
    setFormErrors(null)
    setDialogOpen(true)
  }

  const confirmDelete = (cat: Category) => {
    setDeleteTarget(cat)
    setDeleteOpen(true)
  }

  const handleSave = async () => {
    setFormErrors(null)
    if (!form.name || !form.slug) {
      setFormErrors("Name и slug обязательны")
      return
    }

    setSaving(true)
    try {
      if (editTarget) {
        await adminCategories.update(editTarget.id, form)
      } else {
        await adminCategories.create(form)
      }
      setDialogOpen(false)
      fetchCategories()
    } catch (err: any) {
      setFormErrors(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminCategories.delete(deleteTarget.id)
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchCategories()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // ─── Auto-slug ──────────────────────────────
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

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Категории</h1>
          <p className="text-sm text-gray-400 mt-1">Управление структурой каталога</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Создать категорию
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Поиск категорий..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-gray-700 focus:outline-none"
        />
      </div>

      {/* Tree */}
      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Folder className="mb-3 h-12 w-12" />
              <p className="text-sm">Категорий пока нет</p>
              <p className="text-xs mt-1">Создайте первую категорию</p>
            </div>
          ) : (
            <div className="p-4">
              {renderTree(filtered)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-gray-800 bg-gray-900 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Редактировать категорию" : "Создать категорию"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editTarget ? `Редактирование: ${editTarget.name}` : "Добавьте новую категорию в каталог"}
            </DialogDescription>
          </DialogHeader>

          {formErrors && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formErrors}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Название *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="border-gray-700 bg-gray-800 text-white"
                  placeholder="Мобильная связь"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))}
                  className="border-gray-700 bg-gray-800 text-white font-mono text-xs"
                  placeholder="mobile"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className="border-gray-700 bg-gray-800 text-white"
                placeholder="Описание категории"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Родительская категория</Label>
                <select
                  value={form.parent_id || ""}
                  onChange={(e) => setForm(p => ({ ...p, parent_id: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                >
                  <option value="">— Нет (корневой уровень) —</option>
                  {flatList
                    .filter(f => editTarget ? f.id !== editTarget.id : true)
                    .map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))
                  }
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Иконка</Label>
                <div className="flex flex-wrap gap-1">
                  {ICON_PRESETS.slice(0, 8).map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, icon: p.icon === icon ? "" : icon }))}
                      className={`h-8 w-8 rounded text-base transition-colors ${
                        form.icon === icon ? "bg-primary/20 ring-1 ring-primary" : "bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Порядок сортировки</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm(p => ({ ...p, is_active: v }))}
                  />
                  <Label className="text-gray-300 cursor-pointer">
                    {form.is_active ? "Активна" : "Скрыта"}
                  </Label>
                </div>
              </div>
            </div>
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

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-gray-800 bg-gray-900 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить категорию</DialogTitle>
            <DialogDescription className="text-gray-400">
              Вы уверены, что хотите удалить категорию «{deleteTarget?.name}»?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
            <p>Товары этой категории будут перенесены в «Без категории».</p>
            {deleteTarget && (
              <p className="mt-1">
                Подкатегорий: {deleteTarget.children?.length || 0}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-700 text-gray-300">
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
