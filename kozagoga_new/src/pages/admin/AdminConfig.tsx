import { Card, CardContent } from "@/components/ui/card"
import { Settings, Construction } from "lucide-react"

export default function AdminConfig() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Конфигурация</h1>
        <p className="text-sm text-gray-400 mt-1">Настройка бизнес-процессов и интеграций</p>
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Construction className="mb-4 h-16 w-16" />
          <p className="text-lg font-medium">Раздел в разработке</p>
          <p className="text-sm mt-2 text-center max-w-md">
            Здесь будет редактор конфигурации с раздельным доступом (только superadmin),
            structured editor, raw YAML, бэкапами и graceful reload. Запланирован на Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
