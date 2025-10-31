import { buildAnalysisContext, generateSmartPrompt } from "@/lib/multi-file-analyzer"
import { mlPatternEngine } from "@/lib/ml-code-pattern-engine"
import { learningPipeline } from "@/lib/continuous-learning-pipeline"
import { apiIntegration } from "@/lib/api-integration"

export const maxDuration = 60

export async function POST(req: Request) {
  const { code, isProject, fileCount, dependencyIssues, projectFiles, dependencyGraph } = await req.json()

  console.log("[v0] Analyze code API called with:", { codeLength: code?.length, isProject, fileCount })

  let enhancedPrompt = ""
  let qualityReport = null
  let mlInsights = null

  if (isProject && projectFiles && dependencyGraph) {
    const analysisContext = buildAnalysisContext(projectFiles, dependencyGraph)
    enhancedPrompt = generateSmartPrompt(analysisContext, dependencyIssues || [])
    qualityReport = analysisContext.qualityReport
  }

  try {
    await learningPipeline.initializePipeline()
    mlInsights = await mlPatternEngine.analyzePattern(code, isProject ? "multi-file" : "javascript")

    console.log("[v0] ML Insights calculated:", {
      anomalyScore: mlInsights?.anomalyScore,
      patternsFound: mlInsights?.patterns?.length,
      confidence: mlInsights?.modelConfidence,
    })
  } catch (error) {
    console.log("[v0] ML analysis error (non-blocking):", error instanceof Error ? error.message : error)
  }

  const systemPrompt = `You are an expert code debugger and analyzer with deep expertise in multi-file project analysis and multiple programming languages.

SUPPORTED LANGUAGES:
- JavaScript/TypeScript (ES6+, Node.js, React, Next.js)
- Python (Python 3.x, Django, Flask)
- Java (Java 8+, Spring, Jakarta EE)
- PHP (PHP 7+, Laravel, Symfony)
- PostgreSQL/SQL (queries, schemas, stored procedures)
- C/C++, Go, Rust, Ruby, Swift, Kotlin

Your role is to:
1. Carefully analyze code for errors, bugs, and potential issues across ALL supported languages
2. Identify syntax errors, logical errors, runtime errors, and code quality issues
3. ${isProject ? "Understand file relationships, imports, and dependencies across the project" : "Focus on the single file provided"}
4. Provide precise, actionable fixes with clear explanations specific to each language
5. Be thorough but concise in your analysis
6. ${isProject ? "ALWAYS specify which file each error is in" : ""}
7. DETECT AND REPORT: duplicate code, dead code, redundant code, and high complexity functions
8. Suggest refactoring opportunities to improve code quality
9. Apply language-specific best practices and idioms

${
  mlInsights
    ? `ML-POWERED INSIGHTS:
- Anomaly Score: ${mlInsights.anomalyScore.toFixed(2)} (0=clean, 1=anomalous)
- Detected Patterns: ${mlInsights.patterns.map((p: any) => p.name).join(", ")}
- Model Confidence: ${(mlInsights.modelConfidence * 100).toFixed(0)}%

RECOMMENDATIONS FROM MACHINE LEARNING:
${mlInsights.recommendations.map((r: string) => `- ${r}`).join("\n")}
`
    : ""
}

Respond with ONLY valid JSON (no markdown, no code blocks). Use this exact structure:
{
  "status": "analyzing" | "complete",
  "summary": "Brief overview of findings across ${isProject ? "the entire project" : "the code"}",
  "errors": [
    {
      "type": "SyntaxError" | "TypeError" | "LogicError" | "RuntimeError" | "CodeQuality" | "DependencyError" | "CircularDependency" | "IntegrationError" | "DuplicateCode" | "DeadCode" | "RedundantCode" | "HighComplexity" | "SecurityVulnerability" | "PerformanceIssue",
      "line": <line_number>,
      "message": "${isProject ? "MUST include file path like 'In file.tsx: description'" : "Clear description of the issue"}",
      "severity": "error" | "warning" | "info"
    }
  ],
  "fixes": [
    {
      "description": "${isProject ? "What this fix does and which file(s) to modify" : "What this fix does"}",
      "code": "The corrected code snippet with proper syntax for the language"
    }
  ]
}`

  const userPrompt = `Analyze this ${isProject ? "project" : "code"} and identify all errors, bugs, and issues:\n\n${code}`

  console.log("[v0] Calling apiIntegration.generateText for direct analysis...")

  try {
    const analysisText = await apiIntegration.generateText(userPrompt, systemPrompt)

    console.log("[v0] Analysis text received, length:", analysisText.length)

    let analysis
    try {
      analysis = JSON.parse(analysisText)
    } catch (e) {
      console.error("[v0] Failed to parse analysis response:", analysisText.substring(0, 200))
      // If JSON parsing fails, wrap response in proper format
      analysis = {
        status: "complete",
        summary: analysisText,
        errors: [],
        fixes: [],
      }
    }

    if (mlInsights) {
      analysis.mlInsights = {
        anomalyScore: mlInsights.anomalyScore,
        patterns: mlInsights.patterns,
        recommendations: mlInsights.recommendations,
        confidence: mlInsights.modelConfidence,
      }
    }

    console.log("[v0] Returning analysis response:", {
      status: analysis.status,
      errorsCount: analysis.errors?.length || 0,
      fixesCount: analysis.fixes?.length || 0,
    })

    return new Response(JSON.stringify(analysis), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("[v0] Analysis error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({
        status: "error",
        summary: `Failed to analyze code: ${errorMessage}`,
        errors: [{ type: "System", message: errorMessage, severity: "error" }],
        fixes: [],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
