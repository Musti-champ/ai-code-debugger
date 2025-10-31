"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  FileCode,
  Filter,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FixApplier } from "./fix-applier"

interface ErrorItem {
  type: string
  line?: number
  message: string
  severity: "error" | "warning" | "info"
}

interface Fix {
  description: string
  code: string
}

interface ProjectErrorReportProps {
  errors: ErrorItem[]
  fixes: Fix[]
  summary: string
  isProject: boolean
  originalFiles?: Array<{ name: string; path: string; content: string }>
}

export function ProjectErrorReport({ errors, fixes, summary, isProject, originalFiles }: ProjectErrorReportProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [severityFilter, setSeverityFilter] = useState<"all" | "error" | "warning" | "info">("all")
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped")

  // Group errors by file
  const fileErrors = useMemo(() => {
    const grouped = new Map<string, ErrorItem[]>()

    errors.forEach((error) => {
      // Extract file name from error message
      const fileMatch = error.message.match(/(?:In|File:|in file)\s+([^\s:,]+\.[a-z]+)/i)
      const fileName = fileMatch ? fileMatch[1] : "General"

      if (!grouped.has(fileName)) {
        grouped.set(fileName, [])
      }
      grouped.get(fileName)!.push(error)
    })

    return Array.from(grouped.entries())
      .map(([file, errors]) => ({ file, errors }))
      .sort((a, b) => {
        // Sort by error count (descending)
        const aErrorCount = a.errors.filter((e) => e.severity === "error").length
        const bErrorCount = b.errors.filter((e) => e.severity === "error").length
        return bErrorCount - aErrorCount
      })
  }, [errors])

  // Filter errors by severity
  const filteredFileErrors = useMemo(() => {
    if (severityFilter === "all") return fileErrors

    return fileErrors
      .map((fe) => ({
        file: fe.file,
        errors: fe.errors.filter((e) => e.severity === severityFilter),
      }))
      .filter((fe) => fe.errors.length > 0)
  }, [fileErrors, severityFilter])

  // Calculate statistics
  const stats = useMemo(() => {
    const errorCount = errors.filter((e) => e.severity === "error").length
    const warningCount = errors.filter((e) => e.severity === "warning").length
    const infoCount = errors.filter((e) => e.severity === "info").length
    const filesWithErrors = fileErrors.length

    return { errorCount, warningCount, infoCount, filesWithErrors }
  }, [errors, fileErrors])

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(file)) {
        next.delete(file)
      } else {
        next.add(file)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedFiles(new Set(fileErrors.map((fe) => fe.file)))
  }

  const collapseAll = () => {
    setExpandedFiles(new Set())
  }

  if (!isProject || fileErrors.length <= 1) {
    // Simple list view for single file or non-project
    return (
      <div className="space-y-6">
        {summary && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm leading-relaxed">{summary}</p>
          </div>
        )}

        <FixApplier fixes={fixes} originalFiles={originalFiles} isProject={isProject} />

        {errors.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Detected Issues ({errors.length})
            </h3>
            <div className="space-y-2">
              {errors.map((error, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border",
                    error.severity === "error" && "bg-destructive/5 border-destructive/20",
                    error.severity === "warning" && "bg-yellow-500/5 border-yellow-500/20",
                    error.severity === "info" && "bg-blue-500/5 border-blue-500/20",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Badge variant={error.severity === "error" ? "destructive" : "secondary"} className="mt-0.5">
                      {error.type}
                    </Badge>
                    {error.line && (
                      <Badge variant="outline" className="mt-0.5">
                        Line {error.line}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-2">{error.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {fixes.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Suggested Fixes ({fixes.length})
            </h3>
            <div className="space-y-4">
              {fixes.map((fix, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-sm font-medium">{fix.description}</p>
                  <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                    <code>{fix.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Project-wide error report UI
  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      <FixApplier fixes={fixes} originalFiles={originalFiles} isProject={isProject} />

      {/* Statistics */}
      <Card className="p-4 bg-gradient-to-r from-destructive/5 to-yellow-500/5">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{stats.errorCount}</div>
            <div className="text-xs text-muted-foreground">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.warningCount}</div>
            <div className="text-xs text-muted-foreground">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.infoCount}</div>
            <div className="text-xs text-muted-foreground">Info</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.filesWithErrors}</div>
            <div className="text-xs text-muted-foreground">Files</div>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Tabs value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)} className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="error" className="text-xs">
                Errors
              </TabsTrigger>
              <TabsTrigger value="warning" className="text-xs">
                Warnings
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs">
                Info
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
            Collapse All
          </Button>
        </div>
      </div>

      {/* File-grouped errors */}
      <div className="space-y-2">
        {filteredFileErrors.map((fileError) => {
          const isExpanded = expandedFiles.has(fileError.file)
          const errorCount = fileError.errors.filter((e) => e.severity === "error").length
          const warningCount = fileError.errors.filter((e) => e.severity === "warning").length
          const infoCount = fileError.errors.filter((e) => e.severity === "info").length

          return (
            <Card key={fileError.file} className="overflow-hidden">
              <button
                onClick={() => toggleFile(fileError.file)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <FileCode className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{fileError.file}</span>
                </div>
                <div className="flex items-center gap-2">
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {errorCount} {errorCount === 1 ? "error" : "errors"}
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-700">
                      {warningCount} {warningCount === 1 ? "warning" : "warnings"}
                    </Badge>
                  )}
                  {infoCount > 0 && (
                    <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700">
                      {infoCount} info
                    </Badge>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-4 space-y-2 bg-muted/20">
                  {fileError.errors.map((error, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border bg-background",
                        error.severity === "error" && "border-destructive/20",
                        error.severity === "warning" && "border-yellow-500/20",
                        error.severity === "info" && "border-blue-500/20",
                      )}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {error.severity === "error" && <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />}
                        {error.severity === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                        {error.severity === "info" && <Info className="h-4 w-4 text-blue-500 mt-0.5" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={error.severity === "error" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {error.type}
                            </Badge>
                            {error.line && (
                              <Badge variant="outline" className="text-xs">
                                Line {error.line}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{error.message.replace(/^In [^\s:]+:\s*/, "")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Fixes */}
      {fixes.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Suggested Fixes ({fixes.length})
          </h3>
          <div className="space-y-4">
            {fixes.map((fix, idx) => (
              <Card key={idx} className="p-4 space-y-2">
                <p className="text-sm font-medium">{fix.description}</p>
                <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                  <code>{fix.code}</code>
                </pre>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
