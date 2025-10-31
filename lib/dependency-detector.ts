export interface DetectedDependency {
  name: string
  version: string
  type: "dependencies" | "devDependencies"
}

const DEPENDENCY_VERSIONS: Record<string, string> = {
  // React ecosystem
  react: "^18.3.1",
  "react-dom": "^18.3.1",
  next: "^15.1.0",

  // UI libraries
  "lucide-react": "^0.468.0",
  clsx: "^2.1.1",
  "tailwind-merge": "^2.6.0",
  "class-variance-authority": "^0.7.1",

  // Utilities
  jszip: "^3.10.1",
  "date-fns": "^4.1.0",
  zod: "^3.24.1",

  // AI/ML
  ai: "^4.1.10",
  "@ai-sdk/openai": "^1.0.10",
  "@ai-sdk/anthropic": "^1.0.10",

  // Database
  "@supabase/supabase-js": "^2.47.10",
  "@neondatabase/serverless": "^0.10.5",
  "drizzle-orm": "^0.38.3",

  // Dev dependencies
  typescript: "^5.7.2",
  "@types/node": "^22.10.2",
  "@types/react": "^18.3.18",
  "@types/react-dom": "^18.3.5",
  eslint: "^9.17.0",
  tailwindcss: "^4.0.0",
}

const DEV_DEPENDENCIES = new Set([
  "typescript",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "eslint",
  "prettier",
  "@typescript-eslint/parser",
  "@typescript-eslint/eslint-plugin",
])

export function detectDependencies(files: Array<{ content: string; path: string }>): DetectedDependency[] {
  const dependencies = new Set<string>()

  // Regex patterns for import statements
  const importPatterns = [
    /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g, // ES6 imports
    /require\s*$$\s*['"]([^'"]+)['"]\s*$$/g, // CommonJS require
    /import\s*$$\s*['"]([^'"]+)['"]\s*$$/g, // Dynamic imports
  ]

  for (const file of files) {
    for (const pattern of importPatterns) {
      const matches = file.content.matchAll(pattern)
      for (const match of matches) {
        const importPath = match[1]

        // Skip relative imports
        if (importPath.startsWith(".") || importPath.startsWith("/")) continue

        // Extract package name (handle scoped packages)
        let packageName = importPath
        if (importPath.startsWith("@")) {
          // Scoped package: @scope/package
          const parts = importPath.split("/")
          packageName = `${parts[0]}/${parts[1]}`
        } else {
          // Regular package: package or package/subpath
          packageName = importPath.split("/")[0]
        }

        dependencies.add(packageName)
      }
    }
  }

  // Convert to dependency objects with versions
  const detected: DetectedDependency[] = []

  for (const dep of dependencies) {
    detected.push({
      name: dep,
      version: DEPENDENCY_VERSIONS[dep] || "latest",
      type: DEV_DEPENDENCIES.has(dep) ? "devDependencies" : "dependencies",
    })
  }

  return detected.sort((a, b) => a.name.localeCompare(b.name))
}

export function generatePackageJson(dependencies: DetectedDependency[], projectName = "debugged-project"): string {
  const deps: Record<string, string> = {}
  const devDeps: Record<string, string> = {}

  for (const dep of dependencies) {
    if (dep.type === "devDependencies") {
      devDeps[dep.name] = dep.version
    } else {
      deps[dep.name] = dep.version
    }
  }

  const packageJson = {
    name: projectName,
    version: "1.0.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "eslint .",
    },
    dependencies: deps,
    devDependencies: devDeps,
  }

  return JSON.stringify(packageJson, null, 2)
}
