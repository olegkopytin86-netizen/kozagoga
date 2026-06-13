import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { Star, Clock, MapPin, Shield, CheckCircle, ChevronLeft, Zap, Package, ShoppingCart, Info, MessageCircle, HelpCircle, ChevronDown, Minus, Plus } from "lucide-react"
import { db } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TrustBlock from "@/components/TrustBlock"
import { useCart } from "@/contexts/CartContext"
import { cn, formatPrice } from "@/lib/utils"
import ServiceForm from "@/components/ServiceForm"
import type { Product, ProductImage } from "@/types/database"

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return
      const { data: prodData } = await db
        .from("products")
        .select("*")
        .eq("slug", slug)
        .single()
      if (prodData) {
        setProduct(prodData as Product)
        const { data: imgData } = await db
          .from("product_images")
          .select("*")
          .eq("product_id", prodData.id)
          .order("sort_order", { ascending: true })
        if (imgData) setImages(imgData as ProductImage[])
      }
      setLoading(false)
    }
    fetchProduct()
  }, [slug])

  const handleAddToCart = () => {
    if (!product) return
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: images[0]?.url || "",
      slug: product.slug,
    })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleBuyNow = () => {
    handleAddToCart()
    navigate("/checkout")
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-6 w-32" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="mb-2 text-2xl font-bold">Товар не найден</h2>
        <p className="mb-6 text-muted-foreground">Возможно, он был удалён или ссылка неверна</p>
        <Link to="/catalog">
          <Button>Вернуться в каталог</Button>
        </Link>
      </div>
    )
  }

  const faq = (product.faq as { question: string; answer: string }[]) || []
  const features = (product.features as string[]) || []
  const reviews: { author: string; rating: number; text: string; date: string }[] = []

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Хлебные крошки */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Главная</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-primary transition-colors">Каталог</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Изображения */}
          <div>
            <div className="mb-4 overflow-hidden rounded-xl border bg-secondary">
              <img
                src={
                  images[activeImage]?.url ||
                  `https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&q=80`
                }
                alt={images[activeImage]?.alt || product.name}
                className="aspect-[4/3] w-full object-cover transition-all duration-300 hover:scale-105"
                onError={(e) => {
                  const i = e.target as HTMLImageElement
                  i.onerror = null
                  i.src = `https://placehold.co/800x600/f5f5f0/78716c?text=${encodeURIComponent(product.name.substring(0, 30))}`
                }}
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(idx)}
                    className={cn(
                      "overflow-hidden rounded-lg border-2 transition-all",
                      idx === activeImage ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-primary/50"
                    )}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || ""}
                      className="h-16 w-16 object-cover"
                      onError={(e) => {
                        const i = e.target as HTMLImageElement
                        i.onerror = null
                        i.src = `https://placehold.co/64x64/f5f5f0/78716c?text=${idx + 1}`
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Информация */}
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {product.is_featured && (
                <Badge className="bg-primary text-primary-foreground">Хит продаж</Badge>
              )}
              {product.seller_verified && (
                <Badge variant="success">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Проверенный продавец
                </Badge>
              )}
              {product.region && (
                <Badge variant="secondary">
                  <MapPin className="mr-1 h-3 w-3" />
                  {product.region}
                </Badge>
              )}
            </div>

            <h1 className="mb-2 text-3xl font-bold">{product.name}</h1>

            {product.seller_name && (
              <p className="mb-4 text-sm text-muted-foreground">
                Продавец: {product.seller_name}
              </p>
            )}

            {/* Рейтинг */}
            {product.rating && (
              <div className="mb-4 flex items-center gap-2">
                <div className="flex items-center">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="ml-1 font-semibold">{Number(product.rating || 0).toFixed(1)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.review_count || 0} отзывов)
                </span>
              </div>
            )}

            <p className="mb-6 text-base text-muted-foreground leading-relaxed">
              {product.description}
            </p>

            {/* Характеристики */}
            <div className="mb-6 space-y-3">
              {product.delivery_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Время доставки:</span>
                  <span className="font-medium">{product.delivery_time}</span>
                </div>
              )}
              {product.stock !== null && product.stock !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">В наличии:</span>
                  <span className="font-medium">{product.stock > 0 ? `${product.stock} шт.` : "Под заказ"}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Гарантия:</span>
                <span className="font-medium">Возврат в течение 24 часов</span>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Цена */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">{formatPrice(product.price)}</span>
                {product.old_price && product.old_price > product.price && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.old_price)}
                  </span>
                )}
                {product.old_price && product.old_price > product.price && (
                  <Badge className="bg-red-500 text-white">
                    -{Math.round((1 - product.price / product.old_price) * 100)}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Для обычных товаров — количество и кнопки */}
            {!product.provider_code ? (
              <>
              <div className="mb-6 flex items-center gap-4">
                <span className="text-sm font-medium">Количество:</span>
                <div className="flex items-center rounded-lg border">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-10 w-10 items-center justify-center text-lg hover:bg-secondary transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-10 w-14 items-center justify-center border-x text-sm font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-10 w-10 items-center justify-center text-lg hover:bg-secondary transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2 flex-1 sm:flex-none" onClick={handleBuyNow}>
                  <Zap className="h-5 w-5" />
                  Купить сейчас
                </Button>
                <Button
                  variant={addedToCart ? "default" : "outline"}
                  size="lg"
                  className={cn("flex-1 sm:flex-none gap-2", addedToCart && "bg-emerald-600 hover:bg-emerald-700")}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {addedToCart ? "Добавлено!" : "В корзину"}
                </Button>
              </div>
              </>
            ) : (
              <div className="border rounded-xl p-5 bg-card">
                <h3 className="font-semibold mb-4">Пополнение услуги</h3>
                <ServiceForm
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    provider_code: product.provider_code || "",
                    provider_service_id: product.provider_service_id || "",
                  }}
                />
              </div>
            )}

            {/* Безопасность */}
            <div className="mt-6 flex items-center gap-4 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span>Безопасная оплата. Гарантия возврата в течение 24 часов.</span>
            </div>
          </div>
        </div>

        {/* Табы: Описание, Отзывы, FAQ */}
        <div className="mt-12">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                <Info className="mr-2 h-4 w-4" />
                Описание
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Отзывы ({product.review_count || 0})
              </TabsTrigger>
              <TabsTrigger
                value="faq"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                FAQ ({faq.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="pt-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <h3 className="mb-4 text-lg font-semibold">Подробное описание</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
                    <p>{product.description}</p>
                  </div>
                </div>
                <div>
                  {features.length > 0 && (
                    <div className="rounded-xl border bg-card p-6">
                      <h3 className="mb-4 text-lg font-semibold">Что вы получите</h3>
                      <ul className="space-y-3">
                        {features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="pt-6">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review, idx) => (
                    <div key={idx} className="rounded-xl border bg-card p-6">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {review.author[0]}
                          </div>
                          <span className="font-medium">{review.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-4 w-4",
                                i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.text}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{review.date}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-12 text-center">
                  <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">Пока нет отзывов</h3>
                  <p className="text-sm text-muted-foreground">
                    Будьте первым, кто оставит отзыв о товаре
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="faq" className="pt-6">
              {faq.length > 0 ? (
                <div className="space-y-2">
                  {faq.map((item, idx) => (
                    <details key={idx} className="group rounded-xl border bg-card overflow-hidden">
                      <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-medium hover:bg-secondary/50 transition-colors">
                        <span>{item.question}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t px-6 py-4 text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-12 text-center">
                  <HelpCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">Нет вопросов</h3>
                  <p className="text-sm text-muted-foreground">
                    По этому товару пока нет часто задаваемых вопросов
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <TrustBlock />
    </div>
  )
}
