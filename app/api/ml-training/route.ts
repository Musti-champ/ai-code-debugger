import { type NextRequest, NextResponse } from "next/server"
import { mlPatternEngine } from "@/lib/ml-code-pattern-engine"
import { learningPipeline } from "@/lib/continuous-learning-pipeline"

export async function POST(request: NextRequest) {
  try {
    const { action, code, language, errors, fixes, feedback, dataPointId } = await request.json()

    if (action === "analyze") {
      // Get ML-powered analysis
      const mlAnalysis = await mlPatternEngine.analyzePattern(code, language)

      // Record in learning pipeline
      const dpId = await learningPipeline.processAnalysisResult(code, language, errors, fixes)

      return NextResponse.json({
        mlAnalysis,
        dataPointId: dpId,
        success: true,
      })
    }

    if (action === "feedback") {
      // Record user feedback for continuous learning
      learningPipeline.recordUserFeedback(dataPointId, feedback)

      return NextResponse.json({
        success: true,
        message: "Feedback recorded, model will improve",
      })
    }

    if (action === "metrics") {
      // Get current learning metrics
      const metrics = await learningPipeline.computeMetrics()
      const history = await learningPipeline.getMetricsHistory()

      return NextResponse.json({
        currentMetrics: metrics,
        metricsHistory: history,
        success: true,
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("[ML API] Error:", error)
    return NextResponse.json({ error: "ML analysis failed", details: String(error) }, { status: 500 })
  }
}
