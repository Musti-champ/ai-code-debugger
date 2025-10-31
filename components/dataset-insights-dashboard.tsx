"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Database, TrendingUp, BarChart3, Download } from "lucide-react"
import { useState, useEffect } from "react"

interface DatasetInsights {
  totalSamples: number
  languageDistribution: Record<string, number>
  successRate: number
  averageFixQuality: number
}

export function DatasetInsightsDashboard() {
  const [insights, setInsights] = useState<DatasetInsights | null>(null)
  const [chartData, setChartData] = useState<Array<{ name: string; value: number }>>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ml-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "metrics" }),
      })

      if (response.ok) {
        const data = await response.json()
        // Mock dataset insights based on metrics
        const mockInsights: DatasetInsights = {
          totalSamples: Math.floor(Math.random() * 1000) + 100,
          languageDistribution: {
            JavaScript: 45,
            Python: 25,
            Java: 20,
            PHP: 10,
          },
          successRate: data.currentMetrics.userSatisfactionRate,
          averageFixQuality: data.currentMetrics.averageFixQuality,
        }

        setInsights(mockInsights)

        // Transform language distribution for chart
        const langChart = Object.entries(mockInsights.languageDistribution).map(([lang, count]) => ({
          name: lang,
          value: count,
        }))
        setChartData(langChart)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch insights:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!insights) return null

  return (
    <Card className="p-6 border-border/50">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Dataset Insights
          </h3>
          <Button size="sm" variant="outline" onClick={fetchInsights} disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{insights.totalSamples}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Samples</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-accent">{(insights.successRate * 100).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Success Rate</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-500">{(insights.averageFixQuality * 100).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Fix Quality</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-500">{Object.keys(insights.languageDistribution).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Languages</p>
          </div>
        </div>

        {/* Language Distribution */}
        {chartData.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Language Distribution
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
                <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Language Tags */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold">Analyzed Languages:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(insights.languageDistribution).map((lang) => (
              <Badge key={lang} variant="secondary" className="text-xs">
                {lang}
              </Badge>
            ))}
          </div>
        </div>

        {/* Info Message */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-700">
          <p className="flex items-start gap-2">
            <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Your dataset grows with each analysis. A larger, diverse dataset helps the model make better predictions.
            </span>
          </p>
        </div>
      </div>
    </Card>
  )
}
