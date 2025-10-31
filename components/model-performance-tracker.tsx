"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, Zap } from "lucide-react"
import { useState, useEffect } from "react"

interface PerformanceHistory {
  timestamp: number
  accuracy: number
  fixQuality: number
  satisfaction: number
}

export function ModelPerformanceTracker() {
  const [history, setHistory] = useState<PerformanceHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ml-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "metrics" }),
      })

      if (response.ok) {
        const data = await response.json()

        // Simulate performance history for visualization
        const newEntry: PerformanceHistory = {
          timestamp: Date.now(),
          accuracy: data.currentMetrics.modelAccuracy,
          fixQuality: data.currentMetrics.averageFixQuality,
          satisfaction: data.currentMetrics.userSatisfactionRate,
        }

        setHistory((prev) => {
          const updated = [...prev, newEntry]
          // Keep only last 10 entries
          return updated.slice(-10)
        })
      }
    } catch (error) {
      console.error("[v0] Failed to fetch history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const chartData = history.map((entry, idx) => ({
    name: `T${idx}`,
    Accuracy: Math.round(entry.accuracy * 100),
    "Fix Quality": Math.round(entry.fixQuality * 100),
    Satisfaction: Math.round(entry.satisfaction * 100),
  }))

  const latestMetrics = history.length > 0 ? history[history.length - 1] : null

  return (
    <Card className="p-6 border-border/50">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Model Performance Tracking
          </h3>
          <Badge variant="outline" className="text-xs">
            Live Updates
          </Badge>
        </div>

        {/* Current Status */}
        {latestMetrics && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Model Accuracy</div>
              <div className="text-2xl font-bold text-primary mt-1">{(latestMetrics.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-accent/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Fix Quality</div>
              <div className="text-2xl font-bold text-accent mt-1">{(latestMetrics.fixQuality * 100).toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <div className="text-sm text-muted-foreground">User Satisfaction</div>
              <div className="text-2xl font-bold text-green-500 mt-1">
                {(latestMetrics.satisfaction * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Performance Chart */}
        {chartData.length > 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Performance Over Time</p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
                <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="Accuracy" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Fix Quality" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="Satisfaction"
                  stroke="var(--color-green-500)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Info */}
        <div className="flex gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-700">
          <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            The model tracks performance continuously. As more analyses are completed and feedback is provided, the
            model improves its accuracy and fix quality.
          </p>
        </div>
      </div>
    </Card>
  )
}
