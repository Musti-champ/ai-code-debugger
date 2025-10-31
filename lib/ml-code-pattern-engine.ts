import * as tf from "@tensorflow/tfjs"

interface CodePattern {
  name: string
  signature: string
  frequency: number
  riskScore: number
  fixes: string[]
}

interface MLAnalysisResult {
  patterns: CodePattern[]
  anomalyScore: number
  recommendations: string[]
  modelConfidence: number
}

class MLCodePatternEngine {
  private model: tf.LayersModel | null = null
  private patterns: Map<string, CodePattern> = new Map()
  private trainingData: Array<{ code: string; label: string }> = []

  async initializeModel(): Promise<void> {
    // Create a simple neural network for code pattern classification
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [128], units: 64, activation: "relu" }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: "relu" }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: "relu" }),
        tf.layers.dense({ units: 1, activation: "sigmoid" }),
      ],
    })

    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
    })

    console.log("[ML] Neural network model initialized for code pattern recognition")
  }

  private extractCodeSignature(code: string): number[] {
    const features = new Uint8Array(128)

    // Hash code patterns into feature vector
    const keywords = ["function", "class", "async", "await", "try", "catch", "if", "for", "while"]
    keywords.forEach((keyword, index) => {
      const regex = new RegExp(keyword, "gi")
      const matches = code.match(regex) || []
      features[index] = Math.min(255, matches.length * 25)
    })

    // Add complexity metrics
    features[9] = Math.min(255, code.split("\n").length)
    features[10] = Math.min(255, code.split("{").length * 10)
    features[11] = Math.min(255, code.split("import").length * 30)

    return Array.from(features).map((f) => f / 255)
  }

  async analyzePattern(code: string, language: string): Promise<MLAnalysisResult> {
    if (!this.model) await this.initializeModel()

    const signature = this.extractCodeSignature(code)
    const tensorInput = tf.tensor2d([signature])

    // Get anomaly prediction
    const anomalyPrediction = this.model!.predict(tensorInput) as tf.Tensor
    const anomalyScore = (await anomalyPrediction.data())[0]

    tensorInput.dispose()
    anomalyPrediction.dispose()

    // Identify patterns
    const patterns = this.identifyPatterns(code, language)

    // Generate recommendations based on patterns and anomaly score
    const recommendations = this.generateRecommendations(patterns, anomalyScore)

    return {
      patterns,
      anomalyScore,
      recommendations,
      modelConfidence: 1 - Math.abs(0.5 - anomalyScore) * 2,
    }
  }

  private identifyPatterns(code: string, language: string): CodePattern[] {
    const patterns: CodePattern[] = []

    // Language-specific pattern matching
    const patternRules = this.getPatternRules(language)

    patternRules.forEach((rule) => {
      const matches = code.match(rule.regex) || []
      if (matches.length > 0) {
        patterns.push({
          name: rule.name,
          signature: matches[0],
          frequency: matches.length,
          riskScore: rule.riskScore,
          fixes: rule.suggestedFixes,
        })
      }
    })

    return patterns
  }

  private getPatternRules(language: string) {
    const commonRules = [
      {
        name: "Global Variable Usage",
        regex: /^(global|var\s+)\s+\w+/gm,
        riskScore: 0.7,
        suggestedFixes: ["Use local scope", "Use const/let", "Pass as parameters"],
      },
      {
        name: "Deep Nesting",
        regex: /(\{\s*\{)/g,
        riskScore: 0.6,
        suggestedFixes: ["Extract to separate function", "Use early return", "Reduce complexity"],
      },
      {
        name: "Long Functions",
        regex: /function\s+\w+[^{]*\{[\s\S]{1000,}/gm,
        riskScore: 0.5,
        suggestedFixes: ["Break into smaller functions", "Extract logic", "Use helper functions"],
      },
    ]

    const languageSpecific: Record<string, any[]> = {
      python: [
        {
          name: "Missing Type Hints",
          regex: /def\s+\w+$$[^)]*$$\s*:/g,
          riskScore: 0.3,
          suggestedFixes: ["Add type hints", "Use typing module"],
        },
      ],
      java: [
        {
          name: "Missing Access Modifiers",
          regex: /\s(class|interface|void|int|String)\s+\w+/g,
          riskScore: 0.4,
          suggestedFixes: ["Add public/private", "Add static if needed"],
        },
      ],
      php: [
        {
          name: "SQL Injection Risk",
          regex: /\$_\w+\s*\.\s*query/g,
          riskScore: 0.9,
          suggestedFixes: ["Use prepared statements", "Use parameterized queries", "Use ORM"],
        },
      ],
    }

    return [...commonRules, ...(languageSpecific[language] || [])]
  }

  private generateRecommendations(patterns: CodePattern[], anomalyScore: number): string[] {
    const recommendations: string[] = []

    patterns.forEach((pattern) => {
      if (pattern.riskScore > 0.5) {
        recommendations.push(`${pattern.name}: ${pattern.fixes[0]}`)
      }
    })

    if (anomalyScore > 0.7) {
      recommendations.push("High anomaly detected - Consider refactoring")
    }

    return recommendations.slice(0, 5)
  }

  addTrainingData(code: string, label: string): void {
    this.trainingData.push({ code, label })
  }

  async trainModel(): Promise<void> {
    if (this.trainingData.length === 0 || !this.model) return

    const xs = tf.tensor2d(this.trainingData.map((d) => this.extractCodeSignature(d.code)))
    const ys = tf.tensor2d(
      this.trainingData.map((d) => [d.label === "error" ? 1 : 0]),
      [this.trainingData.length, 1],
    )

    await this.model.fit(xs, ys, {
      epochs: 10,
      batchSize: 4,
      verbose: 0,
    })

    xs.dispose()
    ys.dispose()

    console.log("[ML] Model trained on", this.trainingData.length, "samples")
  }
}

export const mlPatternEngine = new MLCodePatternEngine()
