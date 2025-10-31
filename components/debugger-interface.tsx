"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  FileCode,
  Loader2,
  Upload,
  Zap,
  FolderOpen,
  File,
  X,
  Network,
  AlertTriangle,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import JSZip from "jszip"
import { analyzeDependencies, getDependencyIssues, type DependencyGraph } from "@/lib/dependency-analyzer"
import { ProjectErrorReport } from "./project-error-report"
import { MLInsightsPanel } from "./ml-insights-panel"
import { LearningMetricsDisplay } from "./learning-metrics-display"
import { DebugChatBot } from "./debug-chat-bot"
import { SecurityVulnerabilitiesPanel } from "./security-vulnerabilities-panel"
import { GitIntegrationPanel } from "./git-integration-panel"
import { FixPreviewDiff } from "./fix-preview-diff"
import { scanSecurityVulnerabilities } from "@/lib/security-vulnerability-scanner"
import { analyzePullRequest } from "@/lib/git-analyzer"
import { APIConfigChecker } from "./api-config-checker"

interface AnalysisResult {
  status: "analyzing" | "complete" | "error"
  errors: Array<{
    type: string
    line?: number
    message: string
    severity: "error" | "warning" | "info"
  }>
  fixes: Array<{
    description: string
    code: string
    filePath?: string
  }>
  summary: string
  mlInsights?: {
    anomalyScore: number
    patterns: Array<{
      name: string
      frequency: number
      riskScore: number
    }>
    recommendations: string[]
    confidence: number
  }
  securityVulnerabilities?: any
  gitAnalysis?: any
}

interface ProjectFile {
  name: string
  path: string
  content: string
  language: string
}

export function DebuggerInterface() {
  const [code, setCode] = useState("")
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraph | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState("input")
  const [uploadMode, setUploadMode] = useState<"single" | "project">("single")
  const [currentDataPointId, setCurrentDataPointId] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [debugMode, setDebugMode] = useState<"direct" | "chat">("direct")

  useEffect(() => {
    if (projectFiles.length > 0) {
      const graph = analyzeDependencies(projectFiles)
      setDependencyGraph(graph)
    } else {
      setDependencyGraph(null)
    }
  }, [projectFiles])

  const handleAnalyze = async () => {
    const codeToAnalyze =
      uploadMode === "single"
        ? code
        : projectFiles
            .filter((f) => selectedFiles.has(f.path))
            .map((f) => `// File: ${f.path}\n${f.content}`)
            .join("\n\n")

    if (!codeToAnalyze.trim()) return

    setIsAnalyzing(true)
    setActiveTab("analysis")
    setAnalysis({
      status: "analyzing",
      errors: [],
      fixes: [],
      summary: "",
    })

    try {
      const dependencyIssues = dependencyGraph ? getDependencyIssues(dependencyGraph) : []

      const selectedProjectFiles =
        uploadMode === "project" ? projectFiles.filter((f) => selectedFiles.has(f.path)) : null

      console.log("[v0] Starting direct analysis with debugMode:", debugMode)
      console.log("[v0] Code length:", codeToAnalyze.length)

      const response = await fetch("/api/analyze-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToAnalyze,
          isProject: uploadMode === "project",
          fileCount: uploadMode === "project" ? selectedFiles.size : 1,
          dependencyIssues,
          projectFiles: selectedProjectFiles,
          dependencyGraph,
        }),
      })

      console.log("[v0] Analysis API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Analysis API error response:", errorText)
        throw new Error(`Analysis failed with status ${response.status}: ${errorText}`)
      }

      const analysisData = await response.json()

      console.log("[v0] Analysis response received:", {
        status: analysisData.status,
        errorsCount: analysisData.errors?.length || 0,
        fixesCount: analysisData.fixes?.length || 0,
      })

      setAnalysis((prev) => ({
        ...prev!,
        ...analysisData,
      }))

      if (analysisData.dataPointId) {
        setCurrentDataPointId(analysisData.dataPointId)
      }

      if (uploadMode === "project" && selectedProjectFiles) {
        const securityResults = scanSecurityVulnerabilities(selectedProjectFiles)

        if (selectedProjectFiles.length > 0 && analysis?.fixes) {
          const prAnalysis = await analyzePullRequest(
            selectedProjectFiles[0]?.content || "",
            analysis.fixes[0]?.code || "",
            selectedProjectFiles[0]?.path || "file.ts",
          )

          setAnalysis((prev) => ({
            ...prev!,
            securityVulnerabilities: securityResults,
            gitAnalysis: prAnalysis,
          }))
        }
      } else {
        const securityResults = scanSecurityVulnerabilities([
          { path: "code.ts", content: codeToAnalyze, language: "ts" },
        ])
        setAnalysis((prev) => ({
          ...prev!,
          securityVulnerabilities: securityResults,
        }))
      }
    } catch (error) {
      console.error("[v0] Analysis error:", error)
      setAnalysis({
        status: "error",
        errors: [
          {
            type: "System",
            message: `Failed to analyze code: ${error instanceof Error ? error.message : "Unknown error"}`,
            severity: "error",
          },
        ],
        fixes: [],
        summary: "An error occurred during analysis. Please check your API keys are configured.",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleMLFeedback = async (helpful: boolean) => {
    if (!currentDataPointId) return

    try {
      await fetch("/api/ml-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "feedback",
          dataPointId: currentDataPointId,
          feedback: helpful ? "helpful" : "unhelpful",
        }),
      })

      console.log("[v0] Feedback recorded:", { helpful })
    } catch (error) {
      console.error("[v0] Failed to record feedback:", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.name.endsWith(".zip")) {
      try {
        const zip = new JSZip()
        const contents = await zip.loadAsync(file)
        const files: ProjectFile[] = []

        for (const [path, zipEntry] of Object.entries(contents.files)) {
          if (zipEntry.dir) continue

          const codeExtensions = [
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".py",
            ".java",
            ".cpp",
            ".c",
            ".go",
            ".rs",
            ".php",
            ".rb",
            ".swift",
            ".kt",
            ".sql",
          ]
          if (!codeExtensions.some((ext) => path.endsWith(ext))) continue

          const content = await zipEntry.async("string")
          const extension = path.split(".").pop() || ""

          files.push({
            name: path.split("/").pop() || path,
            path,
            content,
            language: extension,
          })
        }

        setProjectFiles(files)
        setSelectedFiles(new Set(files.map((f) => f.path)))
        setUploadMode("project")
        setActiveTab("input")
      } catch (error) {
        console.error("Failed to extract zip:", error)
        alert("Failed to extract zip file. Please ensure it's a valid zip archive.")
      }
    } else {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCode(event.target?.result as string)
        setUploadMode("single")
        setProjectFiles([])
        setSelectedFiles(new Set())
        setActiveTab("input")
      }
      reader.readAsText(file)
    }
  }

  const toggleFileSelection = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const clearProject = () => {
    setProjectFiles([])
    setSelectedFiles(new Set())
    setUploadMode("single")
    setCode("")
    setDependencyGraph(null)
  }

  const dependencyStats = dependencyGraph
    ? {
        totalFiles: dependencyGraph.nodes.size,
        circularDeps: dependencyGraph.circularDependencies.length,
        missingDeps: dependencyGraph.missingDependencies.length,
        unusedFiles: dependencyGraph.unusedFiles.length,
      }
    : null

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Code2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AI Code Debugger</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Precision error detection with machine learning-powered analysis and continuous improvement
        </p>
      </div>

      <APIConfigChecker />

      <div className="mb-6 flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Debug Mode:</span>
          <div className="flex gap-2 bg-background rounded p-1">
            <button
              onClick={() => setDebugMode("direct")}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                debugMode === "direct"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Direct Fixes
            </button>
            <button
              onClick={() => setDebugMode("chat")}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                debugMode === "chat"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              AI Chat Assistant
            </button>
          </div>
        </div>
        {analysis && analysis.errors.length > 0 && debugMode === "chat" && (
          <Button onClick={() => setShowChat(!showChat)} variant="outline" size="sm">
            {showChat ? "Hide" : "Show"} Chat
          </Button>
        )}
      </div>

      <div className="mb-6">
        <LearningMetricsDisplay />
      </div>

      {dependencyStats && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Dependency Analysis</h3>
                <p className="text-xs text-muted-foreground">{dependencyStats.totalFiles} files analyzed</p>
              </div>
            </div>
            <div className="flex gap-4">
              {dependencyStats.circularDeps > 0 && (
                <div className="text-center">
                  <div className="text-lg font-bold text-destructive">{dependencyStats.circularDeps}</div>
                  <div className="text-xs text-muted-foreground">Circular</div>
                </div>
              )}
              {dependencyStats.missingDeps > 0 && (
                <div className="text-center">
                  <div className="text-lg font-bold text-destructive">{dependencyStats.missingDeps}</div>
                  <div className="text-xs text-muted-foreground">Missing</div>
                </div>
              )}
              {dependencyStats.unusedFiles > 0 && (
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-500">{dependencyStats.unusedFiles}</div>
                  <div className="text-xs text-muted-foreground">Unused</div>
                </div>
              )}
              {dependencyStats.circularDeps === 0 &&
                dependencyStats.missingDeps === 0 &&
                dependencyStats.unusedFiles === 0 && (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">All Clear</span>
                  </div>
                )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="input" className="gap-2">
                  {uploadMode === "project" ? <FolderOpen className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
                  {uploadMode === "project" ? "Project Files" : "Code Input"}
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {uploadMode === "project" ? "Project" : "File"}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.go,.rs,.zip,.php,.sql"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {uploadMode === "project" && (
                  <Button variant="ghost" size="sm" onClick={clearProject}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="input" className="mt-0">
              {uploadMode === "single" ? (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste your code here or upload a file..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="min-h-[500px] font-mono text-sm"
                  />
                  <Button onClick={handleAnalyze} disabled={!code.trim() || isAnalyzing} className="w-full" size="lg">
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing Code...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Analyze & Debug
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{projectFiles.length} files detected</span>
                    </div>
                    <Badge variant="secondary">{selectedFiles.size} selected</Badge>
                  </div>

                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    {projectFiles.map((file) => {
                      const node = dependencyGraph?.nodes.get(file.path)
                      const hasIssues =
                        dependencyGraph?.circularDependencies.some((cycle) => cycle.includes(file.path)) ||
                        dependencyGraph?.missingDependencies.some((m) => m.file === file.path) ||
                        dependencyGraph?.unusedFiles.includes(file.path)

                      return (
                        <div
                          key={file.path}
                          className={cn(
                            "flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedFiles.has(file.path) && "bg-primary/5",
                          )}
                          onClick={() => toggleFileSelection(file.path)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.path)}
                            onChange={() => toggleFileSelection(file.path)}
                            className="h-4 w-4"
                          />
                          <File className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              {hasIssues && <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                            {node && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {node.dependencies.length} deps • {node.dependents.length} dependents
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {file.language}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={selectedFiles.size === 0 || isAnalyzing}
                    className="w-full"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing Project...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Analyze {selectedFiles.size} File{selectedFiles.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Analysis Results
            </h2>
          </div>

          {!analysis ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-center">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <Code2 className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Ready to Debug</h3>
              <p className="text-muted-foreground max-w-sm">
                Paste your code or upload a file to begin precision error analysis with AI/ML
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {analysis.securityVulnerabilities && (
                <SecurityVulnerabilitiesPanel
                  vulnerabilities={analysis.securityVulnerabilities.vulnerabilities}
                  score={analysis.securityVulnerabilities.score}
                />
              )}

              {analysis.mlInsights && (
                <MLInsightsPanel
                  insights={analysis.mlInsights}
                  isLoading={analysis.status === "analyzing"}
                  onFeedback={handleMLFeedback}
                />
              )}

              {analysis.fixes.map((fix, idx) => (
                <FixPreviewDiff
                  key={idx}
                  originalCode={getOriginalCode(fix.filePath)}
                  fixedCode={fix.code}
                  description={fix.description}
                  filePath={fix.filePath}
                />
              ))}

              {analysis.gitAnalysis && (
                <GitIntegrationPanel diff={analysis.gitAnalysis.diff} prAnalysis={analysis.gitAnalysis.analysis} />
              )}

              <ProjectErrorReport
                errors={analysis.errors}
                fixes={analysis.fixes}
                summary={analysis.summary}
                isProject={uploadMode === "project"}
                originalFiles={uploadMode === "project" ? projectFiles : undefined}
              />
            </div>
          )}
        </Card>
      </div>

      {showChat && analysis && analysis.errors.length > 0 && debugMode === "chat" && (
        <DebugChatBot errors={analysis.errors} onClose={() => setShowChat(false)} />
      )}

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Real-time Analysis</h3>
              <p className="text-sm text-muted-foreground">Instant error detection with streaming AI responses</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Brain className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">ML-Powered Detection</h3>
              <p className="text-sm text-muted-foreground">
                Machine learning pattern recognition and anomaly detection
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Continuous Learning</h3>
              <p className="text-sm text-muted-foreground">Model improves from your feedback over time</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )

  function getOriginalCode(filePath?: string): string {
    if (!filePath) return code
    const file = projectFiles.find((f) => f.path === filePath)
    return file?.content || code
  }
}
