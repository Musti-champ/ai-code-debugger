"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { useState } from "react"

interface MLInsight {
  anomalyScore: number
  patterns: Array<{
    name: string
    frequency: number
    riskScore: number
  }>
  recommendations: string[]
  confidence: number
}

interface MLInsightsPanelProps {
  insights: MLInsight | null
  isLoading: boolean
  onFeedback?: (helpful: boolean) => void
}

export function MLInsightsPanel({ insights, isLoading, onFeedback }: MLInsightsPanelProps) {
  const [feedbackSent, setFeedbackSent] = useState(false)

  if (!insights || isLoading) {
    return null
  }

  const anomalyLevel = insights.anomalyScore > 0.7 ? "High" : insights.anomalyScore > 0.4 ? "Medium" : "Low"
  const anomalyColor =
    insights.anomalyScore > 0.7
      ? "text-destructive"
      : insights.anomalyScore > 0.4
        ? "text-yellow-500"
        : "text-green-500"

  return (
    <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI/ML Analysis</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {(insights.confidence * 100).toFixed(0)}% Confidence
          </Badge>
        </div>

        {/* Anomaly Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Code Anomaly Score</span>
            <span className={`text-sm font-semibold ${anomalyColor}`}>{anomalyLevel}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                insights.anomalyScore > 0.7
                  ? "bg-destructive"
                  : insights.anomalyScore > 0.4
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${insights.anomalyScore * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {insights.anomalyScore.toFixed(2)} / 1.00 -{" "}
            {insights.anomalyScore > 0.7
              ? "Significant issues detected"
              : insights.anomalyScore > 0.4
                ? "Some issues found"
                : "Code looks healthy"}
          </p>
        </div>

        {/* Detected Patterns */}
        {insights.patterns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Detected Patterns ({insights.patterns.length})
            </h4>
            <div className="space-y-1">
              {insights.patterns.slice(0, 3).map((pattern, idx) => (
                <div key={idx} className="text-xs p-2 bg-background rounded border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pattern.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        pattern.riskScore > 0.7
                          ? "bg-destructive/10 text-destructive"
                          : pattern.riskScore > 0.4
                            ? "bg-yellow-500/10 text-yellow-700"
                            : "bg-green-500/10 text-green-700"
                      }`}
                    >
                      Risk: {(pattern.riskScore * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Found {pattern.frequency}x</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ML Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              ML Recommendations
            </h4>
            <ul className="text-xs space-y-1">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback */}
        {onFeedback && !feedbackSent && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground">Was this analysis helpful?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1 bg-transparent"
                onClick={() => {
                  onFeedback(true)
                  setFeedbackSent(true)
                }}
              >
                Helpful
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1 bg-transparent"
                onClick={() => {
                  onFeedback(false)
                  setFeedbackSent(true)
                }}
              >
                Not helpful
              </Button>
            </div>
          </div>
        )}

        {feedbackSent && (
          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-700">
            Thank you! Your feedback helps improve our model.
          </div>
        )}
      </div>
    </Card>
  )
}
