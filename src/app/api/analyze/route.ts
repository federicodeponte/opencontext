import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * POST /api/analyze
 * Analyzes a website URL and extracts company context using Gemini 3 Pro Preview
 * Uses smart prompting to guide comprehensive analysis
 */

export const maxDuration = 60

// Helper function to verify API key authentication
function verifyApiKey(request: NextRequest): { isValid: boolean; environment?: string } {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No authentication provided - check if it's required
    const hasApiKeys = process.env.OPENCONTEXT_API_KEY || 
                       process.env.OPENCONTEXT_API_KEY_DEV ||
                       process.env.OPENCONTEXT_API_KEY_STAGING ||
                       process.env.OPENCONTEXT_API_KEY_PROD ||
                       process.env.OPENCONTEXT_API_KEYS
    
    // If no API keys configured, allow public access (development mode)
    if (!hasApiKeys) {
      return { isValid: true, environment: 'public' }
    }
    
    return { isValid: false }
  }
  
  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  // Get valid API keys
  const validKeys: string[] = []
  
  // Add individual environment keys
  if (process.env.OPENCONTEXT_API_KEY_DEV) validKeys.push(process.env.OPENCONTEXT_API_KEY_DEV)
  if (process.env.OPENCONTEXT_API_KEY_STAGING) validKeys.push(process.env.OPENCONTEXT_API_KEY_STAGING)
  if (process.env.OPENCONTEXT_API_KEY_PROD) validKeys.push(process.env.OPENCONTEXT_API_KEY_PROD)
  if (process.env.OPENCONTEXT_API_KEY) validKeys.push(process.env.OPENCONTEXT_API_KEY)
  
  // Add comma-separated keys
  if (process.env.OPENCONTEXT_API_KEYS) {
    validKeys.push(...process.env.OPENCONTEXT_API_KEYS.split(',').map(k => k.trim()))
  }
  
  // Check if token is valid
  if (!validKeys.includes(token)) {
    return { isValid: false }
  }
  
  // Determine environment from key prefix
  let environment = 'custom'
  if (token.startsWith('oc_dev_')) environment = 'development'
  else if (token.startsWith('oc_staging_')) environment = 'staging'
  else if (token.startsWith('oc_prod_')) environment = 'production'
  
  return { isValid: true, environment }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verify API key authentication
    const auth = verifyApiKey(request)
    if (!auth.isValid) {
      return NextResponse.json(
        { error: 'API key required. Include "Authorization: Bearer YOUR_API_KEY" header.' },
        { status: 401 }
      )
    }
    
    // Log authentication info (for debugging)
    if (auth.environment !== 'public') {
      console.log(`[ANALYZE] Authenticated request - Environment: ${auth.environment}`)
    }
    
    const body = await request.json()
    const { url, apiKey: clientApiKey } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Use client API key if provided, otherwise use server environment variable
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey || typeof apiKey !== 'string') {
      console.error('[ANALYZE] No API key provided. Send apiKey in request body or set GEMINI_API_KEY environment variable')
      return NextResponse.json(
        { error: 'API key required. Send "apiKey" in request body or configure GEMINI_API_KEY environment variable.' },
        { status: 400 }
      )
    }

    // Normalize URL
    const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`

    try {
      // Use Gemini 2.0 Flash with structured JSON output
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      })

      const prompt = `You are an expert business analyst. Analyze the company website at ${normalizedUrl} and extract comprehensive company context.

Visit the URL and carefully analyze all available information to provide:

1. Company basics (name, website, industry)
2. Products/services offered
3. Target audience and ideal customers
4. Brand voice and tone
5. Key value propositions
6. Customer pain points they address
7. Common use cases
8. Content themes they focus on
9. Main competitors (based on industry and offerings)

Return ONLY valid JSON in exactly this format:
{
  "company_name": "Official company name",
  "company_url": "Normalized company website URL", 
  "industry": "Primary industry category",
  "description": "Clear 2-3 sentence company description",
  "products": ["Product 1", "Product 2"],
  "target_audience": "Ideal customer profile description",
  "competitors": ["Competitor 1", "Competitor 2"],
  "tone": "Brand voice description",
  "pain_points": ["Pain point 1", "Pain point 2"],
  "value_propositions": ["Value prop 1", "Value prop 2"], 
  "use_cases": ["Use case 1", "Use case 2"],
  "content_themes": ["Theme 1", "Theme 2"]
}

Analyze: ${normalizedUrl}`

      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      
      // Parse and validate JSON response
      const data = JSON.parse(responseText)
      return NextResponse.json(data)
    } catch (error) {
      if (error instanceof Error) {
        console.error('[ANALYZE] Error occurred:', error.message)
        
        return NextResponse.json(
          { error: 'Gemini API Error', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Unknown error', details: String(error) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Request parsing error:', error)
    return NextResponse.json(
      {
        error: 'Invalid request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    )
  }
}