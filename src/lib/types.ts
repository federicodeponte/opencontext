/**
 * OpenContext - TypeScript type definitions
 * Core interfaces for company context analysis
 */

export interface BusinessContext {
  // Core fields
  companyName?: string
  companyWebsite?: string
  icp?: string
  valueProposition?: string
  
  // Analysis results from AI
  productDescription?: string
  targetIndustries?: string
  targetAudience?: string
  tone?: string
  
  // Arrays converted to comma-separated strings
  products?: string
  competitors?: string
  painPoints?: string
  valuePropositions?: string
  useCases?: string
  contentThemes?: string
  
  // Additional context fields
  systemInstructions?: string
  clientKnowledgeBase?: string
  contentInstructions?: string
  
  // Company info
  legalEntity?: string
  vatNumber?: string
  registrationNumber?: string
  imprintUrl?: string
  contactEmail?: string
  contactPhone?: string
  linkedInUrl?: string
  twitterUrl?: string
  githubUrl?: string
}

export interface SavedCompany {
  id: string
  name: string
  context: BusinessContext
  createdAt: string
}

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

export interface ContextStorageHook {
  businessContext: BusinessContext
  updateContext: (updates: Partial<BusinessContext>) => void
  clearContext: () => void
  hasContext: boolean
  isLoading: boolean
  savedCompanies: SavedCompany[]
  analyzeWebsite: (url: string, apiKey?: string) => Promise<void>
  switchToCompany: (companyId: string) => void
}