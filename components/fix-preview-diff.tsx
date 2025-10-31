"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface DiffLine {
  type: "add" | "remove" | "context"
  content: string
  lineNumber: number
}

interface FixPreviewDiffProps {
  originalCode: string
  fixedCode: string
  description: string
  filePath?: string
}

export function FixPreviewDiff({ originalCode, fixedCode, description, filePath }: FixPreviewDiffProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateDiff = (original: string, fixed: string): DiffLine[] => {
    const origLines = original.split("\n")
    const fixedLines = fixed.split("\n")
    const diff: DiffLine[] = []

    const maxLines = Math.max(origLines.length, fixedLines.length)

    for (let i = 0; i < maxLines; i++) {
      const origLine = origLines[i] || ""
      const fixedLine = fixedLines[i] || ""

      if (origLine === fixedLine) {
        diff.push({ type: "context", content: origLine, lineNumber: i + 1 })
      } else {
        if (origLine) {
          diff.push({ type: "remove", content: origLine, lineNumber: i + 1 })
        }
        if (fixedLine) {
          diff.push({ type: "add", content: fixedLine, lineNumber: i + 1 })
        }
      }
    }

    return diff
  }

  const diff = generateDiff(originalCode, fixedCode)
  const displayDiff = expanded ? diff : diff.slice(0, 10)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fixedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-muted/50 border-b">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{description}</h4>
            {filePath && <p className="text-xs text-muted-foreground mt-1">{filePath}</p>}
          </div>
          <Badge variant="outline" className="ml-2">
            {diff.filter((d) => d.type === "add").length} additions, {diff.filter((d) => d.type === "remove").length}{" "}
            removals
          </Badge>
        </div>
      </div>

      <div className="bg-background/50">
        <div className="font-mono text-xs overflow-x-auto">
          {displayDiff.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                "flex px-4 py-1.5 border-l-2",
                line.type === "add" && "bg-green-500/10 border-l-green-500",
                line.type === "remove" && "bg-red-500/10 border-l-red-500",
                line.type === "context" && "border-l-transparent text-muted-foreground",
              )}
            >
              <span className="w-8 text-muted-foreground select-none">
                {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
              </span>
              <span className="flex-1 whitespace-pre-wrap break-words">{line.content}</span>
            </div>
          ))}
        </div>

        {diff.length > 10 && !expanded && (
          <div className="px-4 py-2 border-t text-center">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(true)} className="text-xs">
              <ChevronDown className="h-3 w-3 mr-1" />
              Show {diff.length - 10} more lines
            </Button>
          </div>
        )}

        {expanded && diff.length > 10 && (
          <div className="px-4 py-2 border-t text-center">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)} className="text-xs">
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </Button>
          </div>
        )}
      </div>

      <div className="p-2 bg-muted/30 border-t flex gap-2">
        <Button onClick={copyToClipboard} size="sm" variant="outline" className="text-xs bg-transparent">
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy Fixed Code
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
