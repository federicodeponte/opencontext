/**
 * OpenContext API - TypeScript type definitions
 */

export interface AnalysisResponse {
  company_name: string
  company_url: string
  industry: string
  description: string
  products: string[]
  target_audience: string
  competitors: string[]
  tone: string
  pain_points: string[]
  value_propositions: string[]
  use_cases: string[]
  content_themes: string[]
}

export interface AnalysisRequest {
  url: string
  apiKey?: string
}