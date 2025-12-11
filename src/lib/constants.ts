/**
 * OpenContext - Constants and configurations
 */

export const DEFAULT_COMPANY = {
  name: "Demo Company",
  website: "https://example.com",
  description: "A sample company for demonstration purposes"
}

export const ANALYSIS_CONFIG = {
  expectedDuration: 30, // seconds
  maxRetries: 3,
  timeout: 60000, // 60 seconds
}

export const STORAGE_KEYS = {
  businessContext: 'opencontext-business-context',
  savedCompanies: 'opencontext-saved-companies',
  analyzedUrl: 'opencontext-analyzed-url'
}

export const AI_MODEL = {
  name: 'gemini-3-pro-preview',
  tools: [
    { urlContext: {} },
    { googleSearch: {} }
  ]
}