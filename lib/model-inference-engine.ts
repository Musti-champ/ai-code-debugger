import type * as tf from "@tensorflow/tfjs"
import { mlPatternEngine } from "./ml-code-pattern-engine"
import { nlpAnalyzer } from "./nlp-semantic-analyzer"

interface InferenceRequest {
  code: string
  language: string
  context?: string
}

interface InferenceResult {
  prediction: string
  confidence: number
  details: {
    mlAnalysis: any
    nlpAnalysis: any
    severityLevel: "critical" | "high" | "medium" | "low"
  }
}

class ModelInferenceEngine {
  private modelCache: Map<string, tf.LayersModel> = new Map()

  async performInference(request: InferenceRequest): Promise<InferenceResult> {
    const { code, language, context } = request

    console.log("[v0] Starting inference for", language)

    // Get ML analysis
    const mlAnalysis = await mlPatternEngine.analyzePattern(code, language)

    // Get NLP analysis
    const comments = this.extractComments(code)
    const nlpAnalysis = nlpAnalyzer.analyzeCodeSemantics(code, comments)

    // Combine results
    const combinedScore = mlAnalysis.anomalyScore * 0.6 + (1 - nlpAnalysis.semanticSimilarity) * 0.4

    // Determine severity
    let severity: "critical" | "high" | "medium" | "low" = "low"
    if (combinedScore > 0.8) severity = "critical"
    else if (combinedScore > 0.6) severity = "high"
    else if (combinedScore > 0.4) severity = "medium"

    // Generate prediction
    const prediction = this.generatePrediction(mlAnalysis, nlpAnalysis, severity)

    return {
      prediction,
      confidence: Math.min(mlAnalysis.modelConfidence, 0.95),
      details: {
        mlAnalysis,
        nlpAnalysis,
        severityLevel: severity,
      },
    }
  }

  private extractComments(code: string): string[] {
    const comments: string[] = []

    // Extract single-line comments
    const singleLineComments = code.match(/\/\/.*$/gm) || []
    comments.push(...singleLineComments.map((c) => c.replace(/^\/\/\s*/, "")))

    // Extract multi-line comments
    const multiLineComments = code.match(/\/\*[\s\S]*?\*\//g) || []
    comments.push(...multiLineComments.map((c) => c.replace(/\/\*|\*\//g, "").trim()))

    return comments
  }

  private generatePrediction(mlAnalysis: any, nlpAnalysis: any, severity: string): string {
    const predictions: string[] = []

    if (mlAnalysis.anomalyScore > 0.7) {
      predictions.push(`Code exhibits unusual patterns (${(mlAnalysis.anomalyScore * 100).toFixed(0)}% anomaly)`)
    }

    if (mlAnalysis.patterns.length > 0) {
      const topPattern = mlAnalysis.patterns[0]
      predictions.push(`Detected: ${topPattern.name} (Risk: ${(topPattern.riskScore * 100).toFixed(0)}%)`)
    }

    if (nlpAnalysis.suggestedAlternatives.length > 0) {
      predictions.push(`Suggestion: ${nlpAnalysis.suggestedAlternatives[0]}`)
    }

    predictions.push(`Severity Level: ${severity.toUpperCase()}`)

    return predictions.join(" • ")
  }

  async batchInference(requests: InferenceRequest[]): Promise<InferenceResult[]> {
    console.log("[v0] Batch inference for", requests.length, "items")
    const results = await Promise.all(requests.map((req) => this.performInference(req)))
    return results
  }
}

export const inferenceEngine = new ModelInferenceEngine()
