import { Link } from "react-router-dom"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <h1 className="mb-4 text-8xl font-bold text-black">404</h1>
        <p className="mb-2 text-2xl font-semibold">Страница не найдена</p>
        <p className="mb-8 text-muted-foreground">
          Возможно, страница была удалена или ссылка неверна
        </p>
        <Link to="/">
          <Button size="lg" className="gap-2">
            <Home className="h-5 w-5" />
            На главную
          </Button>
        </Link>
      </div>
    </div>
  )
}
