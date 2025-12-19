import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/health
 * Health check endpoint for OpenContext service
 * Returns service status and authentication configuration
 */

export async function GET(request: NextRequest): Promise<Response> {
  // Check if API keys are configured
  const hasApiKeys = !!(
    process.env.OPENCONTEXT_API_KEY || 
    process.env.OPENCONTEXT_API_KEY_DEV ||
    process.env.OPENCONTEXT_API_KEY_STAGING ||
    process.env.OPENCONTEXT_API_KEY_PROD ||
    process.env.OPENCONTEXT_API_KEYS
  )
  
  // Check which environments are configured
  const environments = {
    development: !!process.env.OPENCONTEXT_API_KEY_DEV,
    staging: !!process.env.OPENCONTEXT_API_KEY_STAGING,
    production: !!process.env.OPENCONTEXT_API_KEY_PROD,
    multi_key_support: !!process.env.OPENCONTEXT_API_KEYS,
    default_key: !!process.env.OPENCONTEXT_API_KEY
  }
  
  // Check Gemini API key
  const hasGeminiKey = !!process.env.GEMINI_API_KEY
  
  return NextResponse.json({
    status: 'ok',
    service: 'opencontext',
    version: '1.0.0',
    auth_required: hasApiKeys,
    auth_environments: environments,
    gemini_configured: hasGeminiKey,
    features: {
      company_analysis: 'Website analysis and context extraction',
      structured_output: 'JSON-formatted company data',
      ai_model: 'Gemini 3 Pro Preview',
      multi_environment_keys: 'Support for dev/staging/prod API keys'
    },
    timestamp: new Date().toISOString()
  })
}