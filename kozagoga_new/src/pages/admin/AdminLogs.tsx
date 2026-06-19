import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Construction } from "lucide-react"

export default function AdminLogs() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Логи</h1>
        <p className="text-sm text-gray-400 mt-1">Системные логи и аудит действий администраторов</p>
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Construction className="mb-4 h-16 w-16" />
          <p className="text-lg font-medium">Раздел в разработке</p>
          <p className="text-sm mt-2 text-center max-w-md">
            Здесь будет интерфейс для просмотра системных логов (аналог Grafana) с фильтрацией,
            поиском, live tail и экспортом. Запланирован на Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
