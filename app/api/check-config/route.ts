export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const openaiKey = process.env.USE_OPENAI_FALLBACK

  const config = {
    gemini: {
      configured: !!geminiKey,
      keyPrefix: geminiKey ? geminiKey.substring(0, 10) + "..." : "not set",
    },
    openrouter: {
      configured: !!openrouterKey,
      keyPrefix: openrouterKey ? openrouterKey.substring(0, 10) + "..." : "not set",
    },
    openai: {
      configured: !!openaiKey,
      keyPrefix: openaiKey ? openaiKey.substring(0, 10) + "..." : "not set",
    },
    timestamp: new Date().toISOString(),
  }

  return Response.json(config)
}
