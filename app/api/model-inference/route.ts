import { type NextRequest, NextResponse } from "next/server"
import { inferenceEngine } from "@/lib/model-inference-engine"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, language, context, isBatch } = body

    if (isBatch && Array.isArray(code)) {
      // Batch inference
      const requests = code.map((c: string, idx: number) => ({
        code: c,
        language: language[idx] || "javascript",
        context: context?.[idx],
      }))

      const results = await inferenceEngine.batchInference(requests)

      return NextResponse.json({
        success: true,
        results,
        timestamp: Date.now(),
      })
    } else {
      // Single inference
      const result = await inferenceEngine.performInference({
        code,
        language: language || "javascript",
        context,
      })

      return NextResponse.json({
        success: true,
        result,
        timestamp: Date.now(),
      })
    }
  } catch (error) {
    console.error("[Model Inference Error]:", error)
    return NextResponse.json(
      {
        error: "Inference failed",
        details: String(error),
      },
      { status: 500 },
    )
  }
}
