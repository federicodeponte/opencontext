import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * POST /api/analyze
 * Analyzes a website URL and extracts company context using Gemini
 * Uses smart prompting to guide comprehensive analysis
 */

export const maxDuration = 60

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()
    const { url, apiKey: clientApiKey } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Use server environment variable first, fallback to client key if needed
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey

    if (!apiKey || typeof apiKey !== 'string') {
      console.error('[ANALYZE] No GEMINI_API_KEY environment variable set')
      return NextResponse.json(
        { error: 'Website analysis is temporarily unavailable. Please configure your Gemini API key.' },
        { status: 503 }
      )
    }

    // Normalize URL
    const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`

    try {
      // Use Gemini Pro with structured JSON output
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
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
        const errorMessage = error.message.toLowerCase()
        
        // API key errors
        if (errorMessage.includes('api key') || 
            errorMessage.includes('invalid') ||
            errorMessage.includes('unauthorized')) {
          return NextResponse.json(
            { error: 'Invalid Gemini API key. Please check your configuration.' },
            { status: 401 }
          )
        }
        
        console.error('Website analysis error:', error)
        return NextResponse.json(
          {
            error: 'Failed to analyze website',
            message: error.message,
          },
          { status: 500 }
        )
      }

      console.error('Website analysis error:', error)
      return NextResponse.json(
        {
          error: 'Failed to analyze website',
          message: 'Unknown error',
        },
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