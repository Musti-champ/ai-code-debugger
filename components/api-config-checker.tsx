"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface ConfigStatus {
  gemini: { configured: boolean; keyPrefix: string }
  openrouter: { configured: boolean; keyPrefix: string }
  openai: { configured: boolean; keyPrefix: string }
  timestamp: string
}

export function APIConfigChecker() {
  const [config, setConfig] = useState<ConfigStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch("/api/check-config")
        const data = await response.json()
        setConfig(data)
      } catch (error) {
        console.error("[v0] Failed to check API config:", error)
      } finally {
        setLoading(false)
      }
    }

    checkConfig()
  }, [])

  if (loading) return null

  const configuredCount = Object.values(config || {})
    .filter((v): v is { configured: boolean } => typeof v === "object" && "configured" in v)
    .filter((v) => v.configured).length

  return (
    <Card className="p-4 mb-6 border-blue-200 bg-blue-50">
      <div className="flex items-start gap-3">
        {configuredCount > 0 ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-2">API Configuration Status</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={config?.gemini.configured ? "default" : "outline"}>
                Gemini {config?.gemini.configured ? "✓" : "✗"}
              </Badge>
              <span className="text-xs text-muted-foreground">{config?.gemini.keyPrefix}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config?.openai.configured ? "default" : "outline"}>
                OpenAI {config?.openai.configured ? "✓" : "✗"}
              </Badge>
              <span className="text-xs text-muted-foreground">{config?.openai.keyPrefix}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config?.openrouter.configured ? "default" : "outline"}>
                DeepSeek/OpenRouter {config?.openrouter.configured ? "✓" : "✗"}
              </Badge>
              <span className="text-xs text-muted-foreground">{config?.openrouter.keyPrefix}</span>
            </div>
          </div>
          {configuredCount === 0 && (
            <p className="text-xs text-red-600 mt-3 font-medium">
              No API keys configured. Please add GEMINI_API_KEY, USE_OPENAI_FALLBACK, or OPENROUTER_API_KEY to your
              environment variables.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
