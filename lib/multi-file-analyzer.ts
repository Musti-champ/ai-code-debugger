import type { DependencyGraph } from "./dependency-analyzer"
import { analyzeCodeQuality, type CodeQualityReport } from "./code-quality-analyzer"

export interface FileContext {
  path: string
  content: string
  language: string
  dependencies: string[]
  dependents: string[]
  exports: string[]
}

export interface AnalysisContext {
  files: FileContext[]
  dependencyGraph: DependencyGraph
  entryPoints: string[]
  totalLines: number
  qualityReport?: CodeQualityReport
}

export function buildAnalysisContext(
  files: Array<{ path: string; content: string; language: string }>,
  dependencyGraph: DependencyGraph,
): AnalysisContext {
  const fileContexts: FileContext[] = files.map((file) => {
    const node = dependencyGraph.nodes.get(file.path)
    return {
      path: file.path,
      content: file.content,
      language: file.language,
      dependencies: node?.dependencies || [],
      dependents: node?.dependents || [],
      exports: node?.exports || [],
    }
  })

  const entryPoints = fileContexts.filter((f) => f.dependents.length === 0 || isEntryPoint(f.path)).map((f) => f.path)

  const totalLines = files.reduce((sum, f) => sum + f.content.split("\n").length, 0)

  const qualityReport = analyzeCodeQuality(files, dependencyGraph)

  return {
    files: fileContexts,
    dependencyGraph,
    entryPoints,
    totalLines,
    qualityReport,
  }
}

function isEntryPoint(path: string): boolean {
  const entryPatterns = [
    /^index\./,
    /^main\./,
    /^app\./,
    /page\.(tsx?|jsx?)$/,
    /layout\.(tsx?|jsx?)$/,
    /route\.(tsx?|jsx?)$/,
  ]
  return entryPatterns.some((pattern) => pattern.test(path))
}

export function generateSmartPrompt(context: AnalysisContext, dependencyIssues: any[]): string {
  const fileList = context.files
    .map((f) => {
      const depInfo = f.dependencies.length > 0 ? ` (imports: ${f.dependencies.length})` : ""
      const depndInfo = f.dependents.length > 0 ? ` (used by: ${f.dependents.length})` : ""
      return `  - ${f.path}${depInfo}${depndInfo}`
    })
    .join("\n")

  const entryPointInfo = context.entryPoints.length > 0 ? `\nEntry Points: ${context.entryPoints.join(", ")}` : ""

  const dependencyInfo =
    dependencyIssues.length > 0
      ? `\n\nDEPENDENCY ISSUES DETECTED:
${dependencyIssues
  .map(
    (issue) =>
      `- ${issue.type.toUpperCase()}: ${issue.message}
  Severity: ${issue.severity}
  Affected Files: ${issue.files.join(", ")}`,
  )
  .join("\n\n")}`
      : ""

  const qualityInfo = context.qualityReport
    ? `\n\nCODE QUALITY ISSUES DETECTED:

DUPLICATE CODE (${context.qualityReport.duplicates.length} instances):
${context.qualityReport.duplicates
  .slice(0, 5)
  .map(
    (dup) =>
      `- ${dup.similarity.toFixed(0)}% similar code found in:
  ${dup.blocks.map((b) => `${b.file} (lines ${b.startLine}-${b.endLine})`).join("\n  ")}`,
  )
  .join("\n")}

DEAD CODE (${context.qualityReport.deadCode.length} instances):
${context.qualityReport.deadCode
  .slice(0, 10)
  .map((dead) => `- ${dead.type} "${dead.name}" in ${dead.file}:${dead.line} - ${dead.reason}`)
  .join("\n")}

REDUNDANT CODE (${context.qualityReport.redundantCode.length} instances):
${context.qualityReport.redundantCode
  .slice(0, 10)
  .map((red) => `- ${red.file}:${red.line} - ${red.message}`)
  .join("\n")}

HIGH COMPLEXITY (${context.qualityReport.complexityIssues.length} functions):
${context.qualityReport.complexityIssues
  .slice(0, 5)
  .map((comp) => `- ${comp.function} in ${comp.file}:${comp.line} (complexity: ${comp.complexity})`)
  .join("\n")}`
    : ""

  return `PROJECT STRUCTURE:
Total Files: ${context.files.length}
Total Lines: ${context.totalLines}${entryPointInfo}

FILES IN PROJECT:
${fileList}${dependencyInfo}${qualityInfo}

ANALYSIS INSTRUCTIONS:
1. Analyze each file in the context of the entire project
2. Identify errors that span multiple files (e.g., incorrect imports, type mismatches)
3. Detect integration issues between components
4. Consider the dependency graph when suggesting fixes
5. Prioritize errors by severity and impact on the project
6. For each error, specify which file(s) are affected
7. Provide fixes that maintain consistency across the project
8. REPORT ALL DUPLICATE CODE, DEAD CODE, AND REDUNDANT CODE FOUND
9. Suggest refactoring for high complexity functions
10. Identify opportunities to extract common code into shared utilities

When reporting errors, ALWAYS include the file path in the error message.`
}

export interface FileSpecificError {
  file: string
  type: string
  line?: number
  message: string
  severity: "error" | "warning" | "info"
  relatedFiles?: string[]
}

export function parseFileSpecificErrors(errors: any[]): FileSpecificError[] {
  return errors.map((error) => {
    // Try to extract file path from error message
    const fileMatch = error.message.match(/(?:in|file|at)\s+([^\s:]+\.[a-z]+)/i)
    const file = fileMatch ? fileMatch[1] : "unknown"

    // Try to extract related files
    const relatedMatch = error.message.match(/related to:?\s*([^\n]+)/i)
    const relatedFiles = relatedMatch ? relatedMatch[1].split(",").map((f: string) => f.trim()) : undefined

    return {
      file,
      type: error.type,
      line: error.line,
      message: error.message,
      severity: error.severity,
      relatedFiles,
    }
  })
}
