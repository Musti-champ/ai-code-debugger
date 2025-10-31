"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check, GitBranch, FileText } from "lucide-react"
import type { PRAnalysis, GitDiff } from "@/lib/git-analyzer"

interface GitIntegrationPanelProps {
  diff: GitDiff
  prAnalysis: PRAnalysis
}

export function GitIntegrationPanel({ diff, prAnalysis }: GitIntegrationPanelProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const copyToClipboard = (text: string, tab: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-primary" />
          Git & Pull Request Integration
        </h3>
      </div>

      <Tabs defaultValue="diff" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diff">Diff</TabsTrigger>
          <TabsTrigger value="commit">Commit Message</TabsTrigger>
          <TabsTrigger value="pr">PR Description</TabsTrigger>
        </TabsList>

        <TabsContent value="diff" className="space-y-3">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm">{diff.file}</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-green-600">
                  +{diff.additions}
                </Badge>
                <Badge variant="outline" className="text-red-600">
                  -{diff.deletions}
                </Badge>
              </div>
            </div>
            <pre className="text-xs overflow-x-auto bg-background/50 p-3 rounded border">{diff.changes}</pre>
            <Button
              onClick={() => copyToClipboard(diff.changes, "diff")}
              size="sm"
              variant="outline"
              className="w-full"
            >
              {copiedTab === "diff" ? (
                <>
                  <Check className="h-3 w-3 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Diff
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="commit" className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Conventional Commit Message</label>
            <pre className="text-xs bg-background/50 p-3 rounded border overflow-x-auto">
              {prAnalysis.commitMessage}
            </pre>
            <Button
              onClick={() => copyToClipboard(prAnalysis.commitMessage, "commit")}
              size="sm"
              variant="outline"
              className="w-full"
            >
              {copiedTab === "commit" ? (
                <>
                  <Check className="h-3 w-3 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Commit Message
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Assessment</h4>
            <div className="space-y-2">
              {prAnalysis.risks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-600 mt-1">⚠</span>
                  <span className="text-muted-foreground">{risk}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pr" className="space-y-3">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">PR Title</label>
              <input
                type="text"
                value={prAnalysis.title}
                readOnly
                className="w-full mt-1 p-2 bg-muted/50 rounded border text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-sm font-medium">PR Description</label>
              <pre className="text-xs bg-background/50 p-3 rounded border overflow-x-auto mt-1">
                {prAnalysis.description}
              </pre>
            </div>

            <Button
              onClick={() => copyToClipboard(prAnalysis.description, "pr")}
              size="sm"
              variant="outline"
              className="w-full"
            >
              {copiedTab === "pr" ? (
                <>
                  <Check className="h-3 w-3 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy PR Description
                </>
              )}
            </Button>

            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Changelog
              </h4>
              <pre className="text-xs bg-background/50 p-3 rounded border overflow-x-auto">{prAnalysis.changelog}</pre>
              <Button
                onClick={() => copyToClipboard(prAnalysis.changelog, "changelog")}
                size="sm"
                variant="outline"
                className="w-full"
              >
                {copiedTab === "changelog" ? (
                  <>
                    <Check className="h-3 w-3 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-2" />
                    Copy Changelog
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
