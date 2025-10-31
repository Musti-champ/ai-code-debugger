interface StreamChunk {
  text: string
}

class CustomAPIIntegration {
  private geminiKey: string | undefined
  private openrouterKey: string | undefined
  private openaiKey: string | undefined

  constructor() {
    this.geminiKey = process.env.GEMINI_API_KEY
    this.openrouterKey = process.env.OPENROUTER_API_KEY
    this.openaiKey = process.env.USE_OPENAI_FALLBACK

    console.log("[v0] API Integration initialized:")
    console.log("[v0] - Gemini:", this.geminiKey ? "✓ Configured" : "✗ Not configured")
    console.log("[v0] - OpenRouter (DeepSeek):", this.openrouterKey ? "✓ Configured" : "✗ Not configured")
    console.log("[v0] - OpenAI:", this.openaiKey ? "✓ Configured" : "✗ Not configured")
  }

  private async *geminiGenerator(prompt: string, systemPrompt: string): AsyncGenerator<string, void, unknown> {
    const apiKey = this.geminiKey
    if (!apiKey) throw new Error("Gemini API key not configured")

    try {
      console.log("[v0] Gemini API call starting...")
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: systemPrompt + "\n\n" + prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4000,
            },
          }),
        },
      )

      console.log("[v0] Gemini Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Gemini API error:", response.status, errorText)
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body from Gemini")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6))
              const content = json.candidates?.[0]?.content?.parts?.[0]?.text
              if (content) {
                yield content
              }
            } catch (e) {
              console.error("[v0] JSON parse error:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("[v0] Gemini error:", error)
      throw error
    }
  }

  private async *deepseekGenerator(prompt: string, systemPrompt: string): AsyncGenerator<string, void, unknown> {
    const apiKey = this.openrouterKey
    if (!apiKey) throw new Error("OpenRouter API key not configured")

    try {
      console.log("[v0] DeepSeek API call starting...")
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-v3",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
          stream: true,
        }),
      })

      console.log("[v0] DeepSeek Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] DeepSeek API error:", response.status, errorText)
        throw new Error(`DeepSeek API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body from DeepSeek")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6))
              const content = json.choices?.[0]?.delta?.content
              if (content) {
                yield content
              }
            } catch (e) {
              console.error("[v0] JSON parse error:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("[v0] DeepSeek error:", error)
      throw error
    }
  }

  private async *openaiGenerator(prompt: string, systemPrompt: string): AsyncGenerator<string, void, unknown> {
    const apiKey = this.openaiKey
    if (!apiKey) throw new Error("OpenAI API key not configured")

    try {
      console.log("[v0] OpenAI API call starting...")
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
          stream: true,
        }),
      })

      console.log("[v0] OpenAI Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] OpenAI API error:", response.status, errorText)
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body from OpenAI")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6))
              const content = json.choices?.[0]?.delta?.content
              if (content) {
                yield content
              }
            } catch (e) {
              console.error("[v0] JSON parse error:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("[v0] OpenAI error:", error)
      throw error
    }
  }

  async streamWithFallback(prompt: string, systemPrompt: string): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder()

    const providers = [
      {
        name: "Gemini",
        enabled: !!this.geminiKey,
        generator: () => this.geminiGenerator(prompt, systemPrompt),
      },
      {
        name: "OpenAI",
        enabled: !!this.openaiKey,
        generator: () => this.openaiGenerator(prompt, systemPrompt),
      },
      {
        name: "DeepSeek",
        enabled: !!this.openrouterKey,
        generator: () => this.deepseekGenerator(prompt, systemPrompt),
      },
    ].filter((p) => p.enabled)

    if (providers.length === 0) {
      const errorMsg = "No API providers configured. Set GEMINI_API_KEY, USE_OPENAI_FALLBACK, or OPENROUTER_API_KEY."
      console.error("[v0]", errorMsg)
      throw new Error(errorMsg)
    }

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        let lastError: Error | null = null

        for (const provider of providers) {
          try {
            console.log(`[v0] Attempting with ${provider.name}...`)
            const currentGenerator = provider.generator()

            let hasContent = false
            for await (const chunk of currentGenerator) {
              hasContent = true
              console.log(`[v0] ${provider.name} chunk received`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
            }

            if (hasContent) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
              console.log(`[v0] ${provider.name} completed successfully`)
              return
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            const errorMsg = lastError.message
            console.error(`[v0] ${provider.name} failed: ${errorMsg}`)
          }
        }

        const errorMsg = lastError?.message || "All API providers failed"
        console.error("[v0] All providers exhausted:", errorMsg)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              status: "error",
              summary: `Failed to get AI response: ${errorMsg}`,
              errors: [{ type: "System", message: errorMsg, severity: "error" }],
              fixes: [],
            })}\n\n`,
          ),
        )
        controller.close()
      },
    })
  }

  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    let lastError: Error | null = null

    if (this.geminiKey) {
      try {
        console.log("[v0] Generating text with Gemini...")
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": this.geminiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: systemPrompt + "\n\n" + prompt,
                    },
                  ],
                },
              ],
              generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
            }),
          },
        )

        if (response.ok) {
          const json = (await response.json()) as any
          return json.candidates?.[0]?.content?.parts?.[0]?.text || ""
        }
      } catch (error) {
        lastError = error as Error
        console.error("[v0] Gemini error:", lastError.message)
      }
    }

    if (this.openaiKey) {
      try {
        console.log("[v0] Generating text with OpenAI...")
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        })

        if (response.ok) {
          const json = (await response.json()) as any
          return json.choices?.[0]?.message?.content || ""
        }
      } catch (error) {
        lastError = error as Error
        console.error("[v0] OpenAI error:", lastError.message)
      }
    }

    throw lastError || new Error("All API providers failed")
  }
}

export const apiIntegration = new CustomAPIIntegration()
