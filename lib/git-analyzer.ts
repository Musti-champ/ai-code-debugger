export interface GitDiff {
  file: string
  status: "added" | "modified" | "deleted"
  additions: number
  deletions: number
  changes: string
}

export interface PRAnalysis {
  title: string
  description: string
  risks: string[]
  suggestions: string[]
  commitMessage: string
  changelog: string
}

export async function analyzePullRequest(
  originalCode: string,
  fixedCode: string,
  fileName: string,
): Promise<{ diff: GitDiff; analysis: PRAnalysis }> {
  // Calculate basic diff
  const originalLines = originalCode.split("\n").length
  const fixedLines = fixedCode.split("\n").length

  const additions = Math.max(0, fixedLines - originalLines)
  const deletions = Math.max(0, originalLines - fixedLines)

  const diff: GitDiff = {
    file: fileName,
    status: originalCode === "" ? "added" : "modified",
    additions,
    deletions,
    changes: generateDiffText(originalCode, fixedCode),
  }

  // Generate PR analysis
  const analysis: PRAnalysis = {
    title: generatePRTitle(fileName, additions, deletions),
    description: generatePRDescription(fileName),
    risks: assessRisks(originalCode, fixedCode),
    suggestions: generateSuggestions(fixedCode),
    commitMessage: generateCommitMessage(fileName, additions, deletions),
    changelog: generateChangelog(fileName, fixedCode),
  }

  return { diff, analysis }
}

export async function generateGitCommitMessage(
  fixes: Array<{ description: string; code: string; filePath?: string }>,
): Promise<string> {
  const types = new Set(
    fixes.map((f) => {
      if (f.description.includes("fix")) return "fix"
      if (f.description.includes("refactor")) return "refactor"
      if (f.description.includes("security")) return "security"
      if (f.description.includes("feature")) return "feat"
      return "chore"
    }),
  )

  const scope = fixes.length === 1 && fixes[0].filePath ? extractFileName(fixes[0].filePath) : "codebase"
  const type = types.size === 1 ? Array.from(types)[0] : "refactor"

  let message = `${type}(${scope}): ${fixes.map((f) => extractFirstSentence(f.description)).join(", ")}\n\n`

  message += `## Changes\n`
  message += fixes.map((f, i) => `${i + 1}. ${f.description}`).join("\n")

  message += `\n\n## Impact\n`
  message += `- Fixed ${fixes.length} issue${fixes.length !== 1 ? "s" : ""}\n`
  message += `- Improved code quality and maintainability\n`
  message += `- Enhanced error handling\n`

  return message
}

function generateDiffText(original: string, fixed: string): string {
  const origLines = original.split("\n")
  const fixedLines = fixed.split("\n")
  let diff = ""

  const maxLines = Math.max(origLines.length, fixedLines.length)

  for (let i = 0; i < Math.min(maxLines, 5); i++) {
    if (origLines[i] !== fixedLines[i]) {
      if (origLines[i]) diff += `- ${origLines[i]}\n`
      if (fixedLines[i]) diff += `+ ${fixedLines[i]}\n`
    }
  }

  if (maxLines > 5) {
    diff += `\n... and ${maxLines - 5} more lines changed\n`
  }

  return diff
}

function generatePRTitle(fileName: string, additions: number, deletions: number): string {
  const action = deletions > additions ? "Simplify" : "Improve"
  return `${action} ${extractFileName(fileName)} (+${additions} -${deletions})`
}

function generatePRDescription(fileName: string): string {
  return `This PR debugs and fixes issues in ${fileName}.

## Summary
Automated code analysis identified and fixed errors in the following areas:
- Error handling
- Code quality
- Performance optimizations
- Security improvements

## Testing
- Run the test suite to verify no regressions
- Manual testing recommended for critical paths`
}

function assessRisks(original: string, fixed: string): string[] {
  const risks: string[] = []

  if (fixed.length < original.length * 0.5) {
    risks.push("Large refactor: >50% code reduction")
  }

  if (fixed.includes("await") && !original.includes("await")) {
    risks.push("Async behavior change detected")
  }

  if (fixed.includes("throw") && !original.includes("throw")) {
    risks.push("New error handling introduced")
  }

  return risks.length > 0 ? risks : ["Low risk: Minor changes only"]
}

function generateSuggestions(code: string): string[] {
  const suggestions: string[] = []

  if (!code.includes("try") && !code.includes("catch")) {
    suggestions.push("Consider adding error handling with try-catch blocks")
  }

  if (!code.includes("console.log") && !code.includes("logger")) {
    suggestions.push("Add logging for debugging and monitoring")
  }

  if (!code.includes("validate") && !code.includes("check")) {
    suggestions.push("Add input validation where applicable")
  }

  return suggestions
}

function generateCommitMessage(fileName: string, additions: number, deletions: number): string {
  return `fix(${extractFileName(fileName)}): resolve identified issues\n\n- Fixed ${additions + deletions} lines of code\n- Improved code quality and maintainability\n- Enhanced error handling`
}

function generateChangelog(fileName: string, code: string): string {
  return `## v1.0.1 - Bug Fixes

### Fixed
- Resolved multiple errors in ${extractFileName(fileName)}
- Improved error handling and edge case management
- Enhanced code quality and maintainability

### Changed
- Refactored ${extractFileName(fileName)} for better readability
- Optimized performance in critical paths

### Security
- Fixed potential security vulnerabilities
- Enhanced input validation`
}

function extractFileName(path: string): string {
  return path.split("/").pop()?.split(".")[0] || "file"
}

function extractFirstSentence(text: string): string {
  const match = text.match(/[^.!?]+[.!?]+/)
  return (match ? match[0] : text).trim().substring(0, 50)
}
