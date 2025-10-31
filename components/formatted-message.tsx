"use client"

interface FormattedMessageProps {
  content: string
}

export function FormattedMessage({ content }: FormattedMessageProps) {
  const extractTextFromSSE = (text: string): string => {
    // Remove SSE data wrapper: data: {"text":"..."}
    const sseMatch = text.match(/data:\s*\{[^}]*"text":"([^"\\]|\\.)*"\}/g)

    if (sseMatch) {
      // Extract all text parts from SSE chunks
      let extractedText = ""
      sseMatch.forEach((chunk) => {
        try {
          const match = chunk.replace("data: ", "")
          const parsed = JSON.parse(match)
          if (parsed.text) {
            extractedText += parsed.text
          }
        } catch (e) {
          // Fallback: try regex extraction
          const textMatch = chunk.match(/"text":"([^"\\]|\\.)*"/)
          if (textMatch) {
            extractedText += textMatch[0].replace(/"text":"|"/g, "")
          }
        }
      })
      return extractedText
    }

    return text
  }

  const cleanedContent = extractTextFromSSE(content)
    .replace(/\\n/g, "\n") // Convert escape sequence \n to actual newlines
    .replace(/\\t/g, "\t") // Convert escape sequence \t to actual tabs
    .replace(/\\"/g, '"') // Convert escape sequence \" to quotes

  const parseContent = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim()) // Remove empty lines

    return lines.map((line, i) => {
      // Handle headings (### Title)
      if (line.startsWith("###")) {
        return (
          <h3 key={i} className="text-sm font-bold mt-3 mb-2 text-foreground">
            {line.replace(/^#+\s*/, "")}
          </h3>
        )
      }

      // Handle bold text (**text**)
      if (line.includes("**")) {
        const parts = line.split(/\*\*(.*?)\*\*/g)
        return (
          <p key={i} className="text-sm mb-2 leading-relaxed">
            {parts.map((part, idx) =>
              idx % 2 === 1 ? (
                <strong key={idx} className="font-semibold text-foreground">
                  {part}
                </strong>
              ) : (
                <span key={idx}>{part}</span>
              ),
            )}
          </p>
        )
      }

      // Handle numbered lists (1. item, 2. item)
      if (/^\d+\.\s/.test(line.trim())) {
        const text = line.replace(/^\d+\.\s*/, "")
        return (
          <div key={i} className="flex gap-2 mb-2">
            <span className="font-semibold text-primary min-w-fit">{line.match(/^\d+/)?.[0]}.</span>
            <p className="text-sm">{text}</p>
          </div>
        )
      }

      // Handle bullet points (• text or - text or * text)
      if (/^[•\-*]\s/.test(line.trim())) {
        const text = line.replace(/^[•\-*]\s*/, "")
        return (
          <div key={i} className="flex gap-2 mb-1 ml-2">
            <span className="text-primary font-bold">•</span>
            <p className="text-sm">{text}</p>
          </div>
        )
      }

      // Handle indented items (nested bullets/lists)
      if (line.startsWith("  •") || line.startsWith("  -") || line.startsWith("  *")) {
        const text = line.replace(/^\s*[•\-*]\s*/, "")
        return (
          <div key={i} className="flex gap-2 mb-1 ml-6">
            <span className="text-primary/70">◦</span>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        )
      }

      // Handle regular paragraphs
      return (
        <p key={i} className="text-sm mb-3 leading-relaxed text-foreground">
          {line}
        </p>
      )
    })
  }

  return <div className="space-y-1">{parseContent(cleanedContent)}</div>
}
