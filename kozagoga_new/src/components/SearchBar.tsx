// SearchBar — поле поиска с autocomplete dropdown
// (SRS SRC-13.4, SRC-13.7)
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, ArrowRight } from "lucide-react"
import { cn, formatPrice } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

interface AutocompleteItem {
  name: string
  slug: string
  image_url: string | null
  price_min: string | null
  price_max: string | null
  sim: number
}

export default function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Autocomplete запрос
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/autocomplete?q=${encodeURIComponent(query)}`)
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(data)
        setShowDropdown(data.length > 0)
        setActiveIndex(-1)
      } catch {
        // ignore
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Закрытие по клику вне
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSearch = (q?: string) => {
    const term = q || query
    if (!term.trim()) return
    setShowDropdown(false)
    navigate(`/search?q=${encodeURIComponent(term.trim())}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        navigate(`/product/${suggestions[activeIndex].slug}`)
        setShowDropdown(false)
        setQuery("")
      } else {
        handleSearch()
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false)
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Поиск товаров..."
          className="flex h-10 w-full rounded-full border bg-secondary/50 pl-10 pr-10 text-sm outline-none focus:border-primary focus:bg-background transition-colors"
        />
        <button
          onClick={() => handleSearch()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-secondary transition-colors"
        >
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 w-full rounded-xl border bg-background shadow-lg z-50 overflow-hidden"
        >
          {suggestions.map((item, idx) => (
            <button
              key={item.slug}
              onClick={() => {
                navigate(`/product/${item.slug}`)
                setShowDropdown(false)
                setQuery("")
              }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/50",
                idx === activeIndex && "bg-secondary"
              )}
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-lg">
                    {item.name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.price_min && item.price_max && item.price_min !== item.price_max
                    ? `${formatPrice(parseFloat(item.price_min))} — ${formatPrice(parseFloat(item.price_max))}`
                    : item.price_min ? formatPrice(parseFloat(item.price_min)) : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
