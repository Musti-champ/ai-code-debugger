import * as fs from "fs"

interface DataPoint {
  id: string
  code: string
  language: string
  errors: string[]
  fixes: string[]
  timestamp: number
  feedback: "helpful" | "unhelpful" | null
}

interface DatasetMetrics {
  totalSamples: number
  languageDistribution: Record<string, number>
  successRate: number
  averageFixQuality: number
}

class DatasetManager {
  private dataset: DataPoint[] = []
  private datasetFile = "lib/ml-dataset.json"

  async loadDataset(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.datasetFile, "utf-8")
      this.dataset = JSON.parse(data)
      console.log("[Dataset] Loaded", this.dataset.length, "data points")
    } catch (error) {
      console.log("[Dataset] Starting with empty dataset")
      this.dataset = []
    }
  }

  async saveDataset(): Promise<void> {
    await fs.promises.writeFile(this.datasetFile, JSON.stringify(this.dataset, null, 2))
  }

  addDataPoint(codePoint: Omit<DataPoint, "id" | "timestamp">): string {
    const id = `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const dataPoint: DataPoint = {
      ...codePoint,
      id,
      timestamp: Date.now(),
      feedback: null,
    }

    this.dataset.push(dataPoint)
    console.log("[Dataset] Added new data point:", id)
    return id
  }

  recordFeedback(dataPointId: string, feedback: "helpful" | "unhelpful"): void {
    const dataPoint = this.dataset.find((d) => d.id === dataPointId)
    if (dataPoint) {
      dataPoint.feedback = feedback
    }
  }

  getMetrics(): DatasetMetrics {
    const languageDistribution: Record<string, number> = {}
    let successfulFixes = 0
    let totalQualityScore = 0

    this.dataset.forEach((point) => {
      languageDistribution[point.language] = (languageDistribution[point.language] || 0) + 1
      if (point.feedback === "helpful") successfulFixes++
      if (point.fixes.length > 0) totalQualityScore += 1
    })

    return {
      totalSamples: this.dataset.length,
      languageDistribution,
      successRate: this.dataset.length > 0 ? successfulFixes / this.dataset.length : 0,
      averageFixQuality: this.dataset.length > 0 ? totalQualityScore / this.dataset.length : 0,
    }
  }

  getDatasetByLanguage(language: string): DataPoint[] {
    return this.dataset.filter((d) => d.language === language)
  }

  getHelpfulFixes(): DataPoint[] {
    return this.dataset.filter((d) => d.feedback === "helpful")
  }
}

export const datasetManager = new DatasetManager()
