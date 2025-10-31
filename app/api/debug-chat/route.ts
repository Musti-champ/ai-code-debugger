import { apiIntegration } from "@/lib/api-integration"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Debug chat API called")
    const { message, errors, conversationHistory } = await request.json()

    console.log("[v0] Chat input:", {
      messageLength: message?.length || 0,
      errorCount: errors?.length || 0,
      historyLength: conversationHistory?.length || 0,
    })

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const systemPrompt = `You are an expert debugging assistant helping developers fix code errors. 
You have access to the following detected errors:

${(errors || []).map((e: any) => `- ${e.type} (${e.severity}): ${e.message}`).join("\n")}

Your role is to:
1. Explain errors in simple, clear language
2. Suggest step-by-step fixes
3. Provide debugging tips and best practices
4. Help understand why errors occur
5. Suggest prevention strategies

Be conversational, supportive, and focus on education. Use code examples when helpful.`

    const conversationContext = (conversationHistory || [])
      .map((msg: any) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n")

    const fullPrompt = `${systemPrompt}

Previous conversation:
${conversationContext}

User's message: ${message}`

    console.log("[v0] Requesting AI stream from apiIntegration...")
    const aiStream = await apiIntegration.streamWithFallback(fullPrompt, systemPrompt)

    return new Response(aiStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error("[v0] Debug chat error:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Full error stack:", error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown server error",
        type: error instanceof Error ? error.constructor.name : "UnknownError",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
