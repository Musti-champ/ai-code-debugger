import { mlPatternEngine } from "./ml-code-pattern-engine"
import { nlpAnalyzer } from "./nlp-semantic-analyzer"
import { datasetManager } from "./dataset-manager"

interface LearningMetrics {
  modelAccuracy: number
  averageFixQuality: number
  userSatisfactionRate: number
  improvementTrend: number
}

class ContinuousLearningPipeline {
  private metricsHistory: LearningMetrics[] = []
  private updateInterval: NodeJS.Timeout | null = null

  async initializePipeline(): Promise<void> {
    await datasetManager.loadDataset()
    await mlPatternEngine.initializeModel()

    console.log("[Learning Pipeline] Initialized")
  }

  async processAnalysisResult(code: string, language: string, errors: string[], fixes: string[]): Promise<string> {
    // Add to training dataset
    const dataPointId = datasetManager.addDataPoint({
      code,
      language,
      errors,
      fixes,
    })

    // Update ML patterns
    mlPatternEngine.addTrainingData(code, errors.length > 0 ? "error" : "clean")

    // Analyze semantics
    const semanticAnalysis = nlpAnalyzer.analyzeCodeSemantics(code, fixes)

    // Periodically retrain model
    if (Math.random() < 0.1) {
      await mlPatternEngine.trainModel()
      console.log("[Learning] Model retrained with latest data")
    }

    return dataPointId
  }

  recordUserFeedback(dataPointId: string, feedback: "helpful" | "unhelpful"): void {
    datasetManager.recordFeedback(dataPointId, feedback)
    console.log("[Learning] Feedback recorded for", dataPointId)
  }

  async computeMetrics(): Promise<LearningMetrics> {
    const datasetMetrics = datasetManager.getMetrics()

    const metrics: LearningMetrics = {
      modelAccuracy: Math.min(1, 0.8 + datasetMetrics.successRate * 0.2),
      averageFixQuality: datasetMetrics.averageFixQuality,
      userSatisfactionRate: datasetMetrics.successRate,
      improvementTrend: this.calculateTrend(),
    }

    this.metricsHistory.push(metrics)
    return metrics
  }

  private calculateTrend(): number {
    if (this.metricsHistory.length < 2) return 0
    const recent = this.metricsHistory.slice(-5)
    const trend = recent.reduce((sum, m, i) => sum + m.userSatisfactionRate / recent.length, 0)
    return trend - (this.metricsHistory[0].userSatisfactionRate || 0)
  }

  async startContinuousLearning(): Promise<void> {
    // Periodic model updates
    this.updateInterval = setInterval(async () => {
      await mlPatternEngine.trainModel()
      const metrics = await this.computeMetrics()
      console.log("[Learning] Metrics updated:", metrics)
    }, 3600000) // Every hour
  }

  stopContinuousLearning(): void {
    if (this.updateInterval) clearInterval(this.updateInterval)
  }

  async getMetricsHistory(): Promise<LearningMetrics[]> {
    return this.metricsHistory
  }
}

export const learningPipeline = new ContinuousLearningPipeline()
