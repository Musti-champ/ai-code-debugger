"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, Send, X, Minimize2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { FormattedMessage } from "@/components/formatted-message"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

interface DebugChatBotProps {
  errors: Array<{
    type: string
    message: string
    severity: "error" | "warning" | "info"
    line?: number
  }>
  onClose: () => void
}

export function DebugChatBot({ errors, onClose }: DebugChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initialMessage: Message = {
      id: "initial",
      type: "assistant",
      content: `I'm your AI debugging assistant. I've detected ${errors.length} issue${errors.length !== 1 ? "s" : ""} in your code:

${errors.map((e) => `• **${e.type}** (${e.severity}): ${e.message}`).join("\n")}

Feel free to ask me about any of these errors, or ask for general debugging advice. What would you like to know?`,
      timestamp: new Date(),
    }
    setMessages([initialMessage])
  }, [errors])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      console.log("[v0] Sending message to debug chat API...")
      const response = await fetch("/api/debug-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          errors,
          conversationHistory: messages,
        }),
      })

      console.log("[v0] Chat API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Chat API error:", response.status, errorText)
        throw new Error(`Chat API failed: ${response.status} ${errorText}`)
      }

      if (!response.body) {
        throw new Error("No response body from chat API")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        console.log("[v0] Chat chunk received:", chunk.substring(0, 50))
        assistantContent += chunk

        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.type === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: assistantContent }]
          } else {
            return [
              ...prev,
              {
                id: Date.now().toString(),
                type: "assistant",
                content: assistantContent,
                timestamp: new Date(),
              },
            ]
          }
        })
      }
      console.log("[v0] Chat message completed successfully")
    } catch (error) {
      console.error("[v0] Chat error:", error instanceof Error ? error.message : String(error))
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setIsMinimized(false)} className="rounded-full w-12 h-12 p-0 shadow-lg">
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col shadow-2xl rounded-lg border bg-background h-[600px] max-h-[90vh] w-[90vw] sm:w-96 sm:max-w-96">
      <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Debug Assistant</h3>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setIsMinimized(true)} className="h-8 w-8 p-0">
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2 sm:gap-3 animate-in fade-in", msg.type === "user" && "justify-end")}
          >
            {msg.type === "assistant" && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                AI
              </div>
            )}
            <div
              className={cn(
                "rounded-xl px-3 py-2 sm:px-4 sm:py-3 max-w-xs shadow-sm",
                msg.type === "assistant"
                  ? "bg-muted/60 text-foreground border border-border/50"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {msg.type === "assistant" ? (
                <FormattedMessage content={msg.content} />
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              <p className="text-xs opacity-60 mt-2">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
            <div className="rounded-xl px-3 py-2 sm:px-4 sm:py-3 bg-muted/60 border border-border/50">
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-muted/30 space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Ask about errors or debugging tips..."
          className="min-h-12 sm:min-h-16 text-sm resize-none"
        />
        <Button onClick={sendMessage} disabled={!input.trim() || isLoading} className="w-full" size="sm">
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
      </div>
    </div>
  )
}
