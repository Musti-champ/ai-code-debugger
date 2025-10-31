"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, CheckCircle2, Package, FileCode, Loader2 } from "lucide-react"
import JSZip from "jszip"
import { detectDependencies, generatePackageJson } from "@/lib/dependency-detector"

interface Fix {
  description: string
  code: string
  filePath?: string
}

interface FixApplierProps {
  fixes: Fix[]
  originalFiles?: Array<{ name: string; path: string; content: string }>
  isProject: boolean
}

export function FixApplier({ fixes, originalFiles, isProject }: FixApplierProps) {
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const applyFixes = async () => {
    setApplying(true)

    try {
      if (isProject && originalFiles) {
        // Create a zip with all fixed files
        const zip = new JSZip()

        // Apply fixes to files
        const fixedFiles = new Map<string, string>()

        // Start with original files
        for (const file of originalFiles) {
          fixedFiles.set(file.path, file.content)
        }

        // Apply each fix
        for (const fix of fixes) {
          if (fix.filePath) {
            // If fix specifies a file, update that file
            fixedFiles.set(fix.filePath, fix.code)
          } else {
            // Try to extract file path from description
            const fileMatch = fix.description.match(/(?:in|file|modify)\s+([^\s:,]+\.[a-z]+)/i)
            if (fileMatch) {
              fixedFiles.set(fileMatch[1], fix.code)
            }
          }
        }

        // Add all files to zip
        for (const [path, content] of fixedFiles) {
          zip.file(path, content)
        }

        // Detect dependencies and generate package.json
        const filesArray = Array.from(fixedFiles.entries()).map(([path, content]) => ({
          path,
          content,
        }))
        const dependencies = detectDependencies(filesArray)
        const packageJson = generatePackageJson(dependencies, "fixed-project")
        zip.file("package.json", packageJson)

        // Add README with instructions
        const readme = `# Fixed Project

This project has been automatically debugged and fixed by AI Code Debugger.

## Installation

\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

## Running the Project

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

## Fixes Applied

${fixes.map((fix, i) => `${i + 1}. ${fix.description}`).join("\n")}

## Dependencies Detected

${dependencies.map((dep) => `- ${dep.name}@${dep.version}`).join("\n")}
`
        zip.file("README.md", readme)

        // Generate and download zip
        const blob = await zip.generateAsync({ type: "blob" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "fixed-project.zip"
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Single file - download the fixed code
        const fixedCode = fixes.map((f) => f.code).join("\n\n")
        const blob = new Blob([fixedCode], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "fixed-code.txt"
        a.click()
        URL.revokeObjectURL(url)
      }

      setApplied(true)
      setTimeout(() => setApplied(false), 3000)
    } catch (error) {
      console.error("Failed to apply fixes:", error)
      alert("Failed to apply fixes. Please try again.")
    } finally {
      setApplying(false)
    }
  }

  const downloadDependencies = async () => {
    if (!originalFiles) return

    const dependencies = detectDependencies(originalFiles)
    const packageJson = generatePackageJson(dependencies)

    const blob = new Blob([packageJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "package.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (fixes.length === 0) return null

  return (
    <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">Fixes Ready to Apply</h3>
            <p className="text-sm text-muted-foreground">
              {isProject
                ? `${fixes.length} fix${fixes.length !== 1 ? "es" : ""} ready to download as a complete project`
                : "Download the corrected code"}
            </p>
          </div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
            {fixes.length} {fixes.length === 1 ? "Fix" : "Fixes"}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={applyFixes}
            disabled={applying || applied}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying Fixes...
              </>
            ) : applied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {isProject ? "Download Fixed Project" : "Download Fixed Code"}
              </>
            )}
          </Button>

          {isProject && originalFiles && (
            <Button onClick={downloadDependencies} variant="outline" size="icon" title="Download package.json">
              <Package className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isProject && (
          <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <FileCode className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">What's included:</p>
                <ul className="space-y-1">
                  <li>• All fixed source files</li>
                  <li>• Auto-generated package.json with detected dependencies</li>
                  <li>• README with installation instructions</li>
                  <li>• Ready to run with npm/yarn/pnpm install</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
