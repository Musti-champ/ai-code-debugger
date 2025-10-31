export interface DependencyNode {
  path: string
  imports: string[]
  exports: string[]
  dependencies: string[]
  dependents: string[]
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  circularDependencies: string[][]
  missingDependencies: Array<{ file: string; missing: string }>
  unusedFiles: string[]
}

export interface DependencyIssue {
  type: "circular" | "missing" | "unused"
  severity: "error" | "warning"
  message: string
  files: string[]
}

export function analyzeDependencies(files: Array<{ path: string; content: string }>): DependencyGraph {
  const nodes = new Map<string, DependencyNode>()

  // First pass: Extract imports and exports from each file
  for (const file of files) {
    const imports = extractImports(file.content)
    const exports = extractExports(file.content)
    const dependencies = resolveImportPaths(imports, file.path, files)

    nodes.set(file.path, {
      path: file.path,
      imports,
      exports,
      dependencies,
      dependents: [],
    })
  }

  // Second pass: Build dependents list
  for (const [path, node] of nodes.entries()) {
    for (const dep of node.dependencies) {
      const depNode = nodes.get(dep)
      if (depNode) {
        depNode.dependents.push(path)
      }
    }
  }

  // Detect circular dependencies
  const circularDependencies = detectCircularDependencies(nodes)

  // Detect missing dependencies
  const missingDependencies: Array<{ file: string; missing: string }> = []
  for (const [path, node] of nodes.entries()) {
    for (const dep of node.dependencies) {
      if (!nodes.has(dep) && !isExternalDependency(dep)) {
        missingDependencies.push({ file: path, missing: dep })
      }
    }
  }

  // Detect unused files (no dependents and not entry points)
  const unusedFiles: string[] = []
  for (const [path, node] of nodes.entries()) {
    if (node.dependents.length === 0 && !isEntryPoint(path)) {
      unusedFiles.push(path)
    }
  }

  return {
    nodes,
    circularDependencies,
    missingDependencies,
    unusedFiles,
  }
}

function extractImports(content: string): string[] {
  const imports: string[] = []

  // ES6 imports: import ... from '...'
  const es6ImportRegex = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g
  let match
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  // Dynamic imports: import('...')
  const dynamicImportRegex = /import\s*$$\s*['"]([^'"]+)['"]\s*$$/g
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  // CommonJS require: require('...')
  const requireRegex = /require\s*$$\s*['"]([^'"]+)['"]\s*$$/g
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  const pythonImportRegex = /^(?:from\s+([\w.]+)\s+)?import\s+/gm
  while ((match = pythonImportRegex.exec(content)) !== null) {
    if (match[1]) {
      imports.push(match[1])
    }
  }

  const javaImportRegex = /^import\s+([\w.]+);/gm
  while ((match = javaImportRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  const phpUseRegex = /^use\s+([\w\\]+)/gm
  while ((match = phpUseRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  const phpRequireRegex = /require(?:_once)?\s*$$\s*['"]([^'"]+)['"]\s*$$/g
  while ((match = phpRequireRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return [...new Set(imports)]
}

function extractExports(content: string): string[] {
  const exports: string[] = []

  // Named exports: export const/function/class name
  const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g
  let match
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1])
  }

  // Default export
  if (/export\s+default/.test(content)) {
    exports.push("default")
  }

  // Re-exports: export ... from '...'
  const reExportRegex = /export\s+.*\s+from\s+['"]([^'"]+)['"]/g
  while ((match = reExportRegex.exec(content)) !== null) {
    exports.push(`re-export:${match[1]}`)
  }

  return exports
}

function resolveImportPaths(
  imports: string[],
  currentFile: string,
  allFiles: Array<{ path: string; content: string }>,
): string[] {
  const resolved: string[] = []

  for (const imp of imports) {
    // Skip external dependencies (node_modules)
    if (isExternalDependency(imp)) continue

    // Handle relative imports
    if (imp.startsWith(".")) {
      const currentDir = currentFile.split("/").slice(0, -1).join("/")
      let resolvedPath = imp.startsWith("./") ? `${currentDir}/${imp.slice(2)}` : imp

      // Normalize path
      const parts = resolvedPath.split("/")
      const normalized: string[] = []
      for (const part of parts) {
        if (part === "..") {
          normalized.pop()
        } else if (part !== ".") {
          normalized.push(part)
        }
      }
      resolvedPath = normalized.join("/")

      const possiblePaths = [
        resolvedPath,
        `${resolvedPath}.js`,
        `${resolvedPath}.jsx`,
        `${resolvedPath}.ts`,
        `${resolvedPath}.tsx`,
        `${resolvedPath}.py`,
        `${resolvedPath}.java`,
        `${resolvedPath}.php`,
        `${resolvedPath}/index.js`,
        `${resolvedPath}/index.ts`,
        `${resolvedPath}/index.tsx`,
        `${resolvedPath}/index.py`,
        `${resolvedPath}/__init__.py`,
      ]

      for (const path of possiblePaths) {
        if (allFiles.some((f) => f.path === path)) {
          resolved.push(path)
          break
        }
      }
    }
  }

  return resolved
}

function isExternalDependency(importPath: string): boolean {
  // External if it doesn't start with . or /
  return !importPath.startsWith(".") && !importPath.startsWith("/")
}

function isEntryPoint(path: string): boolean {
  // Common entry point patterns
  const entryPatterns = [
    /^index\./,
    /^main\./,
    /^app\./,
    /^src\/index\./,
    /^src\/main\./,
    /page\.(tsx?|jsx?)$/,
    /layout\.(tsx?|jsx?)$/,
  ]
  return entryPatterns.some((pattern) => pattern.test(path))
}

function detectCircularDependencies(nodes: Map<string, DependencyNode>): string[][] {
  const circular: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function dfs(path: string, currentPath: string[]): void {
    visited.add(path)
    recursionStack.add(path)
    currentPath.push(path)

    const node = nodes.get(path)
    if (node) {
      for (const dep of node.dependencies) {
        if (!visited.has(dep)) {
          dfs(dep, [...currentPath])
        } else if (recursionStack.has(dep)) {
          // Found a cycle
          const cycleStart = currentPath.indexOf(dep)
          if (cycleStart !== -1) {
            const cycle = [...currentPath.slice(cycleStart), dep]
            // Check if this cycle is already recorded
            const cycleStr = cycle.join("->")
            if (!circular.some((c) => c.join("->") === cycleStr)) {
              circular.push(cycle)
            }
          }
        }
      }
    }

    recursionStack.delete(path)
  }

  for (const path of nodes.keys()) {
    if (!visited.has(path)) {
      dfs(path, [])
    }
  }

  return circular
}

export function getDependencyIssues(graph: DependencyGraph): DependencyIssue[] {
  const issues: DependencyIssue[] = []

  // Circular dependencies
  for (const cycle of graph.circularDependencies) {
    issues.push({
      type: "circular",
      severity: "error",
      message: `Circular dependency detected: ${cycle.join(" → ")}`,
      files: cycle,
    })
  }

  // Missing dependencies
  for (const { file, missing } of graph.missingDependencies) {
    issues.push({
      type: "missing",
      severity: "error",
      message: `Missing dependency "${missing}" in ${file}`,
      files: [file],
    })
  }

  // Unused files
  for (const file of graph.unusedFiles) {
    issues.push({
      type: "unused",
      severity: "warning",
      message: `File "${file}" is not imported by any other file`,
      files: [file],
    })
  }

  return issues
}
