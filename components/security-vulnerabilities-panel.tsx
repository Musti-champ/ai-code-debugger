"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, Shield, ChevronDown } from "lucide-react"
import { useState } from "react"
import type { SecurityVulnerability } from "@/lib/security-vulnerability-scanner"
import { cn } from "@/lib/utils"

interface SecurityVulnerabilitiesPanelProps {
  vulnerabilities: SecurityVulnerability[]
  score: number
}

export function SecurityVulnerabilitiesPanel({ vulnerabilities, score }: SecurityVulnerabilitiesPanelProps) {
  const [expandedVulns, setExpandedVulns] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedVulns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case "high":
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case "medium":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
      case "high":
        return "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400"
      case "medium":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    if (score >= 40) return "text-orange-600"
    return "text-red-600"
  }

  if (vulnerabilities.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-500/20 rounded-lg">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-700 dark:text-green-400">No Security Vulnerabilities</h3>
            <p className="text-sm text-muted-foreground mt-1">Security Score: 100/100</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Security Vulnerabilities
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {vulnerabilities.length} vulnerability{vulnerabilities.length !== 1 ? "ies" : ""} detected
          </p>
        </div>
        <div className="text-right">
          <div className={cn("text-3xl font-bold", getScoreColor(score))}>{score}</div>
          <p className="text-xs text-muted-foreground">Security Score</p>
        </div>
      </div>

      <div className="space-y-3">
        {vulnerabilities.map((vuln) => (
          <div key={vuln.id} className={cn("border rounded-lg p-4", getSeverityColor(vuln.severity))}>
            <button onClick={() => toggleExpanded(vuln.id)} className="w-full text-left flex items-start gap-3">
              {getSeverityIcon(vuln.severity)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{vuln.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {vuln.type}
                  </Badge>
                </div>
                <p className="text-xs opacity-75">
                  {vuln.file}:{vuln.line}
                </p>
              </div>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform flex-shrink-0", expandedVulns.has(vuln.id) && "rotate-180")}
              />
            </button>

            {expandedVulns.has(vuln.id) && (
              <div className="mt-4 space-y-3 pt-4 border-t border-current/20">
                <div>
                  <p className="text-xs font-semibold opacity-75 mb-1">Description</p>
                  <p className="text-sm">{vuln.description}</p>
                </div>

                {vuln.code && (
                  <div>
                    <p className="text-xs font-semibold opacity-75 mb-1">Affected Code</p>
                    <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">{vuln.code}</pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-semibold opacity-75">CWE</p>
                    <p>{vuln.cwe}</p>
                  </div>
                  <div>
                    <p className="font-semibold opacity-75">OWASP</p>
                    <p>{vuln.owasp}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold opacity-75 mb-1">Remediation</p>
                  <p className="text-sm">{vuln.remediation}</p>
                </div>

                {vuln.example && (
                  <div>
                    <p className="text-xs font-semibold opacity-75 mb-1">Example Fix</p>
                    <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">{vuln.example}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
