/**
 * API usage examples for OpenContext
 * Shows different ways to use the analysis API
 */

import { AnalysisRequest, AnalysisResponse } from '../src/lib/types'

/**
 * Basic API call to analyze a website
 */
export async function analyzeWebsite(url: string): Promise<AnalysisResponse> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Analysis failed')
    }

    return await response.json()
  } catch (error) {
    console.error('Website analysis error:', error)
    throw error
  }
}

/**
 * Analyze website with custom API key
 */
export async function analyzeWithApiKey(
  url: string, 
  apiKey: string
): Promise<AnalysisResponse> {
  const request: AnalysisRequest = {
    url,
    apiKey
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Batch analyze multiple websites
 */
export async function batchAnalyze(urls: string[]): Promise<AnalysisResponse[]> {
  const results = await Promise.allSettled(
    urls.map(url => analyzeWebsite(url))
  )

  return results
    .filter((result): result is PromiseFulfilledResult<AnalysisResponse> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value)
}

/**
 * Analyze website with retry logic
 */
export async function analyzeWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<AnalysisResponse> {
  let lastError: Error = new Error('Analysis failed')

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeWebsite(url)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        break
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error(`Analysis failed after ${maxRetries} attempts: ${lastError.message}`)
}

/**
 * Stream analysis progress (simulation - for demonstration)
 */
export async function analyzeWithProgress(
  url: string,
  onProgress: (progress: number) => void
): Promise<AnalysisResponse> {
  // Simulate progress updates
  const progressInterval = setInterval(() => {
    onProgress(Math.random() * 90)
  }, 1000)

  try {
    const result = await analyzeWebsite(url)
    onProgress(100)
    return result
  } finally {
    clearInterval(progressInterval)
  }
}

/**
 * Validate analysis result
 */
export function validateAnalysisResult(result: any): result is AnalysisResponse {
  return (
    typeof result === 'object' &&
    result !== null &&
    typeof result.company_name === 'string' &&
    typeof result.company_url === 'string' &&
    typeof result.industry === 'string' &&
    typeof result.description === 'string' &&
    Array.isArray(result.products) &&
    typeof result.target_audience === 'string' &&
    Array.isArray(result.competitors) &&
    typeof result.tone === 'string'
  )
}

/**
 * Transform analysis result to different format
 */
export function transformToBusinessContext(result: AnalysisResponse) {
  return {
    companyName: result.company_name,
    companyWebsite: result.company_url,
    targetIndustries: result.industry,
    productDescription: result.description,
    products: result.products.join(', '),
    targetAudience: result.target_audience,
    competitors: result.competitors.join(', '),
    tone: result.tone,
    painPoints: result.pain_points?.join(', ') || '',
    valuePropositions: result.value_propositions?.join(', ') || '',
    useCases: result.use_cases?.join(', ') || '',
    contentThemes: result.content_themes?.join(', ') || '',
  }
}

/**
 * Usage example in a React component
 */
export const ExampleUsage = `
import { analyzeWebsite, analyzeWithProgress } from './api-usage'

function MyComponent() {
  const [result, setResult] = useState(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const analysis = await analyzeWithProgress(
        'https://example.com',
        setProgress
      )
      setResult(analysis)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? \`Analyzing... \${progress.toFixed(0)}%\` : 'Analyze'}
      </button>
      {result && (
        <div>
          <h3>{result.company_name}</h3>
          <p>{result.description}</p>
        </div>
      )}
    </div>
  )
}
`