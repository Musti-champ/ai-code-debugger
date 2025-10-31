import { DebuggerInterface } from "@/components/debugger-interface"
import { DatasetInsightsDashboard } from "@/components/dataset-insights-dashboard"
import { ModelPerformanceTracker } from "@/components/model-performance-tracker"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Github, Settings } from "lucide-react"

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-background">
      {/* Main Debugger Interface */}
      <DebuggerInterface />

      {/* Advanced Analytics & Learning Section */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Advanced Analytics & Learning</h2>
          <p className="text-muted-foreground">
            Real-time model performance tracking and dataset insights for continuous improvement
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <DatasetInsightsDashboard />
          <ModelPerformanceTracker />
        </div>

        {/* Documentation & Resources */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">How It Works</h3>
                <p className="text-xs text-muted-foreground">
                  Learn about ML pattern recognition, NLP analysis, and continuous learning
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Github className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Open Source</h3>
                <p className="text-xs text-muted-foreground">
                  Contribute to the debugger on GitHub and help improve AI-powered code analysis
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Settings className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Configuration</h3>
                <p className="text-xs text-muted-foreground">
                  Customize analysis settings, language preferences, and model parameters
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tech Stack */}
        <Card className="p-6 mt-8">
          <h3 className="font-semibold mb-4">Technology Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "TensorFlow.js", category: "Deep Learning" },
              { name: "NLP Analysis", category: "Semantic Processing" },
              { name: "Pattern Recognition", category: "ML Detection" },
              { name: "Dataset Management", category: "Data Persistence" },
              { name: "Continuous Learning", category: "Model Improvement" },
              { name: "Code Quality Analysis", category: "Static Analysis" },
              { name: "Multi-Language Support", category: "Language Detection" },
              { name: "Dependency Analysis", category: "Project Analysis" },
            ].map((tech) => (
              <div key={tech.name} className="space-y-1">
                <p className="font-medium text-sm">{tech.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {tech.category}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  )
}
