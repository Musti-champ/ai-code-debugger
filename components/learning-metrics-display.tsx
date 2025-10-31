"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Activity, Zap } from "lucide-react"
import { useEffect, useState } from "react"

interface LearningMetrics {
  modelAccuracy: number
  averageFixQuality: number
  userSatisfactionRate: number
  improvementTrend: number
}

export function LearningMetricsDisplay() {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ml-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "metrics" }),
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data.currentMetrics)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch metrics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!metrics) return null

  return (
    <Card className="p-4 border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            Learning Model Performance
          </h3>
          <Badge variant="secondary" className="text-xs">
            Live
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Model Accuracy */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Model Accuracy</div>
            <div className="text-2xl font-bold text-primary">{(metrics.modelAccuracy * 100).toFixed(1)}%</div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="h-full bg-primary rounded-full" style={{ width: `${metrics.modelAccuracy * 100}%` }} />
            </div>
          </div>

          {/* Fix Quality */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Fix Quality</div>
            <div className="text-2xl font-bold text-accent">{(metrics.averageFixQuality * 100).toFixed(1)}%</div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="h-full bg-accent rounded-full" style={{ width: `${metrics.averageFixQuality * 100}%` }} />
            </div>
          </div>

          {/* User Satisfaction */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">User Satisfaction</div>
            <div className="text-2xl font-bold text-green-500">{(metrics.userSatisfactionRate * 100).toFixed(1)}%</div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${metrics.userSatisfactionRate * 100}%` }}
              />
            </div>
          </div>

          {/* Improvement Trend */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Improvement Trend</span>
              <TrendingUp className="h-3 w-3 text-green-500" />
            </div>
            <div
              className={`text-2xl font-bold ${metrics.improvementTrend > 0 ? "text-green-500" : metrics.improvementTrend < 0 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {metrics.improvementTrend > 0 ? "+" : ""}
              {(metrics.improvementTrend * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.improvementTrend > 0 ? "Getting better" : metrics.improvementTrend < 0 ? "Declining" : "Stable"}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" />
            The model improves with each analysis and user feedback
          </p>
        </div>
      </div>
    </Card>
  )
}
