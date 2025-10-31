// Natural Language Processing for code semantics
interface NLPAnalysis {
  codeIntent: string
  semanticSimilarity: number
  suggestedAlternatives: string[]
  clarityScore: number
}

class NLPSemanticAnalyzer {
  private wordVocabulary: Map<string, number[]> = new Map()
  private codeCommentCache: Map<string, string> = new Map()

  private getWordEmbedding(word: string): number[] {
    if (this.wordVocabulary.has(word)) {
      return this.wordVocabulary.get(word)!
    }

    // Generate consistent embedding for word
    const embedding = Array(50)
      .fill(0)
      .map((_, i) => {
        const charCode = word.charCodeAt(i % word.length) || 0
        return Math.sin(charCode + i) * 0.5 + 0.5
      })

    this.wordVocabulary.set(word, embedding)
    return embedding
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return magA && magB ? dotProduct / (magA * magB) : 0
  }

  analyzeCodeSemantics(code: string, comments: string[]): NLPAnalysis {
    // Extract intent from comments and code structure
    const codeWords = code.split(/[\s{};,()[\]]/)
    const commentText = comments.join(" ").toLowerCase()

    // Get embeddings for key words
    const functionWords = codeWords.filter((w) => w.match(/^(function|class|const|let|var)/))
    const intentEmbeddings = functionWords.map((w) => this.getWordEmbedding(w))

    // Calculate semantic clarity
    const avgSimilarity =
      intentEmbeddings.length > 1
        ? intentEmbeddings.reduce((sum, e, i) => {
            if (i === 0) return sum
            return sum + this.cosineSimilarity(e, intentEmbeddings[i - 1])
          }, 0) /
          (intentEmbeddings.length - 1)
        : 0

    // Determine code intent
    let codeIntent = "Utility Function"
    if (code.includes("class ")) codeIntent = "Class Definition"
    if (code.includes("export ")) codeIntent = "Module Export"
    if (code.includes("async ")) codeIntent = "Asynchronous Operation"

    // Generate alternatives based on semantic analysis
    const suggestedAlternatives = this.suggestAlternatives(code, codeIntent)

    return {
      codeIntent,
      semanticSimilarity: avgSimilarity,
      suggestedAlternatives,
      clarityScore: Math.min(1, (commentText.length / code.length) * 2 + 0.5),
    }
  }

  private suggestAlternatives(code: string, intent: string): string[] {
    const alternatives: string[] = []

    if (intent === "Utility Function" && !code.includes("pure")) {
      alternatives.push("Consider making this a pure function")
    }
    if (!code.includes("error") && !code.includes("catch")) {
      alternatives.push("Add error handling")
    }
    if (code.length > 500 && !code.includes("helper")) {
      alternatives.push("Break into smaller, focused functions")
    }

    return alternatives
  }
}

export const nlpAnalyzer = new NLPSemanticAnalyzer()
