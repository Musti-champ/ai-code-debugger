export interface CodeBlock {
  content: string
  startLine: number
  endLine: number
  file: string
}

export interface DuplicateCode {
  blocks: CodeBlock[]
  similarity: number
  lines: number
}

export interface DeadCode {
  type: "function" | "variable" | "import" | "class"
  name: string
  file: string
  line: number
  reason: string
}

export interface RedundantCode {
  type: "duplicate_logic" | "unnecessary_complexity" | "unused_code" | "redundant_condition"
  file: string
  line: number
  message: string
  suggestion: string
}

export interface CodeQualityReport {
  duplicates: DuplicateCode[]
  deadCode: DeadCode[]
  redundantCode: RedundantCode[]
  complexityIssues: Array<{
    file: string
    function: string
    complexity: number
    line: number
  }>
}

export function analyzeCodeQuality(
  files: Array<{ path: string; content: string; language: string }>,
  dependencyGraph: any,
): CodeQualityReport {
  const duplicates = findDuplicateCode(files)
  const deadCode = findDeadCode(files, dependencyGraph)
  const redundantCode = findRedundantCode(files)
  const complexityIssues = analyzeComplexity(files)

  return {
    duplicates,
    deadCode,
    redundantCode,
    complexityIssues,
  }
}

function findDuplicateCode(files: Array<{ path: string; content: string; language: string }>): DuplicateCode[] {
  const duplicates: DuplicateCode[] = []
  const minLines = 5 // Minimum lines to consider as duplicate

  // Extract code blocks from all files
  const allBlocks: CodeBlock[] = []
  for (const file of files) {
    const lines = file.content.split("\n")
    for (let i = 0; i < lines.length - minLines; i++) {
      const block = lines.slice(i, i + minLines).join("\n")
      if (block.trim().length > 50) {
        // Skip very short blocks
        allBlocks.push({
          content: normalizeCode(block),
          startLine: i + 1,
          endLine: i + minLines,
          file: file.path,
        })
      }
    }
  }

  // Compare blocks for similarity
  for (let i = 0; i < allBlocks.length; i++) {
    for (let j = i + 1; j < allBlocks.length; j++) {
      const similarity = calculateSimilarity(allBlocks[i].content, allBlocks[j].content)
      if (similarity > 0.8 && allBlocks[i].file !== allBlocks[j].file) {
        // Only report duplicates across different files
        duplicates.push({
          blocks: [allBlocks[i], allBlocks[j]],
          similarity,
          lines: minLines,
        })
      }
    }
  }

  return duplicates
}

function findDeadCode(
  files: Array<{ path: string; content: string; language: string }>,
  dependencyGraph: any,
): DeadCode[] {
  const deadCode: DeadCode[] = []

  for (const file of files) {
    const lines = file.content.split("\n")

    // Find unused imports
    const imports = extractImports(file.content)
    const usedIdentifiers = extractUsedIdentifiers(file.content)

    for (const imp of imports) {
      if (!usedIdentifiers.has(imp.name)) {
        deadCode.push({
          type: "import",
          name: imp.name,
          file: file.path,
          line: imp.line,
          reason: "Import is never used in this file",
        })
      }
    }

    // Find unused functions
    const functions = extractFunctions(file.content)
    const node = dependencyGraph.nodes.get(file.path)

    for (const func of functions) {
      const isExported = node?.exports.includes(func.name)
      const isUsedInternally = usedIdentifiers.has(func.name)

      if (!isExported && !isUsedInternally) {
        deadCode.push({
          type: "function",
          name: func.name,
          file: file.path,
          line: func.line,
          reason: "Function is never called or exported",
        })
      }
    }

    // Find unused variables
    const variables = extractVariables(file.content)
    for (const variable of variables) {
      const usageCount = countUsages(file.content, variable.name)
      if (usageCount === 1) {
        // Only declared, never used
        deadCode.push({
          type: "variable",
          name: variable.name,
          file: file.path,
          line: variable.line,
          reason: "Variable is declared but never used",
        })
      }
    }
  }

  return deadCode
}

function findRedundantCode(files: Array<{ path: string; content: string; language: string }>): RedundantCode[] {
  const redundant: RedundantCode[] = []

  for (const file of files) {
    const lines = file.content.split("\n")

    lines.forEach((line, index) => {
      // JavaScript/TypeScript redundant conditions
      if (/if\s*$$\s*true\s*$$/.test(line)) {
        redundant.push({
          type: "redundant_condition",
          file: file.path,
          line: index + 1,
          message: "Condition is always true",
          suggestion: "Remove the if statement and keep only the code block",
        })
      }

      if (/if\s*$$\s*false\s*$$/.test(line)) {
        redundant.push({
          type: "redundant_condition",
          file: file.path,
          line: index + 1,
          message: "Condition is always false",
          suggestion: "Remove this entire if block as it will never execute",
        })
      }

      // Python-specific redundant patterns
      if (file.language === "py") {
        if (/if\s+True:/.test(line)) {
          redundant.push({
            type: "redundant_condition",
            file: file.path,
            line: index + 1,
            message: "Condition is always True",
            suggestion: "Remove the if statement and unindent the code block",
          })
        }

        if (/pass\s*$/.test(line) && index > 0) {
          redundant.push({
            type: "unused_code",
            file: file.path,
            line: index + 1,
            message: "Empty pass statement",
            suggestion: "Remove pass or add implementation",
          })
        }
      }

      // Java-specific redundant patterns
      if (file.language === "java") {
        if (/System\.out\.println/.test(line)) {
          redundant.push({
            type: "unused_code",
            file: file.path,
            line: index + 1,
            message: "Debug print statement found",
            suggestion: "Remove System.out.println before production",
          })
        }
      }

      // PHP-specific redundant patterns
      if (file.language === "php") {
        if (/var_dump|print_r/.test(line)) {
          redundant.push({
            type: "unused_code",
            file: file.path,
            line: index + 1,
            message: "Debug statement found",
            suggestion: "Remove var_dump/print_r before production",
          })
        }
      }

      // Double negation (JavaScript/TypeScript)
      if (/!!\w+/.test(line)) {
        redundant.push({
          type: "unnecessary_complexity",
          file: file.path,
          line: index + 1,
          message: "Double negation detected",
          suggestion: "Use Boolean() or remove unnecessary negations",
        })
      }

      // Console statements (JavaScript/TypeScript)
      if (/console\.(log|debug|info|warn)\(/g.test(line)) {
        redundant.push({
          type: "unused_code",
          file: file.path,
          line: index + 1,
          message: "Console statement found",
          suggestion: "Remove console statements before production deployment",
        })
      }
    })
  }

  return redundant
}

function analyzeComplexity(
  files: Array<{ path: string; content: string; language: string }>,
): Array<{ file: string; function: string; complexity: number; line: number }> {
  const complexityIssues: Array<{ file: string; function: string; complexity: number; line: number }> = []

  for (const file of files) {
    const functions = extractFunctions(file.content)

    for (const func of functions) {
      const complexity = calculateCyclomaticComplexity(func.body)
      if (complexity > 10) {
        // Threshold for high complexity
        complexityIssues.push({
          file: file.path,
          function: func.name,
          complexity,
          line: func.line,
        })
      }
    }
  }

  return complexityIssues
}

// Helper functions

function normalizeCode(code: string): string {
  return code
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\/\/.*/g, "") // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
}

function calculateSimilarity(code1: string, code2: string): number {
  const len1 = code1.length
  const len2 = code2.length
  const maxLen = Math.max(len1, len2)

  if (maxLen === 0) return 1

  let matches = 0
  const minLen = Math.min(len1, len2)

  for (let i = 0; i < minLen; i++) {
    if (code1[i] === code2[i]) matches++
  }

  return matches / maxLen
}

function extractImports(content: string): Array<{ name: string; line: number }> {
  const imports: Array<{ name: string; line: number }> = []
  const lines = content.split("\n")

  lines.forEach((line, index) => {
    // ES6 imports (JavaScript/TypeScript)
    const importMatch = line.match(/import\s+(?:{([^}]+)}|(\w+))\s+from/)
    if (importMatch) {
      const names = importMatch[1] ? importMatch[1].split(",").map((n) => n.trim()) : [importMatch[2]]
      names.forEach((name) => {
        imports.push({ name: name.replace(/\s+as\s+\w+/, "").trim(), line: index + 1 })
      })
    }

    // Python import detection
    const pythonImport = line.match(/^(?:from\s+[\w.]+\s+)?import\s+([\w,\s]+)/)
    if (pythonImport) {
      const names = pythonImport[1].split(",").map((n) => n.trim())
      names.forEach((name) => {
        imports.push({ name: name.split(" as ")[0].trim(), line: index + 1 })
      })
    }

    // Java import detection
    const javaImport = line.match(/^import\s+([\w.]+);/)
    if (javaImport) {
      const fullPath = javaImport[1]
      const name = fullPath.split(".").pop() || fullPath
      imports.push({ name, line: index + 1 })
    }

    // PHP use/require detection
    const phpUse = line.match(/^use\s+([\w\\]+)/)
    if (phpUse) {
      const fullPath = phpUse[1]
      const name = fullPath.split("\\").pop() || fullPath
      imports.push({ name, line: index + 1 })
    }

    const phpRequire = line.match(/require(?:_once)?\s*$$\s*['"]([^'"]+)['"]\s*$$/)
    if (phpRequire) {
      imports.push({ name: phpRequire[1], line: index + 1 })
    }
  })

  return imports
}

function extractUsedIdentifiers(content: string): Set<string> {
  const identifiers = new Set<string>()
  const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g
  const matches = content.matchAll(identifierRegex)

  for (const match of matches) {
    identifiers.add(match[1])
  }

  return identifiers
}

function extractFunctions(content: string): Array<{ name: string; line: number; body: string }> {
  const functions: Array<{ name: string; line: number; body: string }> = []
  const lines = content.split("\n")

  lines.forEach((line, index) => {
    // JavaScript/TypeScript function declarations
    const funcMatch = line.match(/function\s+(\w+)\s*\(/)
    if (funcMatch) {
      functions.push({ name: funcMatch[1], line: index + 1, body: extractFunctionBody(content, index) })
    }

    // Arrow functions
    const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:$$[^)]*$$|[^=]+)\s*=>/)
    if (arrowMatch) {
      functions.push({ name: arrowMatch[1], line: index + 1, body: extractFunctionBody(content, index) })
    }

    // Python function detection
    const pythonFunc = line.match(/^def\s+(\w+)\s*\(/)
    if (pythonFunc) {
      functions.push({ name: pythonFunc[1], line: index + 1, body: extractPythonFunctionBody(content, index) })
    }

    // Java method detection
    const javaMethod = line.match(/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/)
    if (javaMethod && !line.includes("class ")) {
      functions.push({ name: javaMethod[1], line: index + 1, body: extractFunctionBody(content, index) })
    }

    // PHP function detection
    const phpFunc = line.match(/function\s+(\w+)\s*\(/)
    if (phpFunc) {
      functions.push({ name: phpFunc[1], line: index + 1, body: extractFunctionBody(content, index) })
    }
  })

  return functions
}

function extractPythonFunctionBody(content: string, startLine: number): string {
  const lines = content.split("\n")
  let body = ""
  let baseIndent = -1

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i]
    const indent = line.search(/\S/)

    if (i === startLine) {
      body += line + "\n"
      continue
    }

    if (baseIndent === -1 && indent > 0) {
      baseIndent = indent
    }

    if (indent < baseIndent && line.trim() !== "") {
      break
    }

    body += line + "\n"
  }

  return body
}

function extractFunctionBody(content: string, startLine: number): string {
  const lines = content.split("\n")
  let braceCount = 0
  let body = ""
  let started = false

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i]
    body += line + "\n"

    for (const char of line) {
      if (char === "{") {
        braceCount++
        started = true
      } else if (char === "}") {
        braceCount--
      }
    }

    if (started && braceCount === 0) break
  }

  return body
}

function extractVariables(content: string): Array<{ name: string; line: number }> {
  const variables: Array<{ name: string; line: number }> = []
  const lines = content.split("\n")

  lines.forEach((line, index) => {
    const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/)
    if (varMatch) {
      variables.push({ name: varMatch[1], line: index + 1 })
    }
  })

  return variables
}

function countUsages(content: string, identifier: string): number {
  const regex = new RegExp(`\\b${identifier}\\b`, "g")
  const matches = content.match(regex)
  return matches ? matches.length : 0
}

function calculateCyclomaticComplexity(code: string): number {
  let complexity = 1 // Base complexity

  // Count decision points
  const decisionKeywords = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\b&&\b/g,
    /\b\|\|\b/g,
    /\?\s*.*\s*:/g, // Ternary operator
  ]

  for (const keyword of decisionKeywords) {
    const matches = code.match(keyword)
    if (matches) complexity += matches.length
  }

  return complexity
}
