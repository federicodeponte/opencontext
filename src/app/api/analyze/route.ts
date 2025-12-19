import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * POST /api/analyze
 * Analyzes a website URL and extracts company context using Gemini 3 Pro Preview
 * Uses Google Search grounding for real URL context (no hallucination)
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

    // Use OPENCONTEXT_GEMINI_KEY to avoid conflicts with shell env
    const apiKey = process.env.OPENCONTEXT_GEMINI_KEY || process.env.GEMINI_API_KEY || clientApiKey

    if (!apiKey || typeof apiKey !== 'string') {
      console.error('[ANALYZE] No OPENCONTEXT_GEMINI_KEY or GEMINI_API_KEY environment variable set')
      return NextResponse.json(
        { error: 'Website analysis is temporarily unavailable. Please configure your Gemini API key.' },
        { status: 503 }
      )
    }

    // Normalize URL
    const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`

    console.log('[ANALYZE] Analyzing URL:', normalizedUrl)

    try {
      // Use SDK with gemini-3-pro-preview + all features:
      // - googleSearch: grounding with real search results
      // - urlContext: fetch and analyze actual URL content
      // - responseMimeType: force JSON output
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-3-pro-preview',
        tools: [
          // @ts-ignore - googleSearch is a valid tool for grounding
          { googleSearch: {} },
          // @ts-ignore - urlContext is a valid tool for URL fetching
          { urlContext: {} }
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })

      const prompt = `You are an expert business analyst and content strategist. Analyze the company website at ${normalizedUrl} and extract comprehensive company context INCLUDING a detailed writing persona.

IMPORTANT INSTRUCTIONS:
1. Use the URL Context tool to fetch and analyze the actual content at ${normalizedUrl}
2. Use Google Search to find additional real information about this company
3. Do NOT make up or hallucinate data - only use information you actually retrieve
4. If you cannot find information about the company, return an error field in the JSON

Analyze all retrieved information to provide:

1. Company basics (name, website, industry)
2. Products/services offered
3. Target audience and ideal customers
4. Brand voice and tone
5. Key value propositions
6. Customer pain points they address
7. Common use cases
8. Content themes they focus on
9. Main competitors (based on industry and offerings)
10. **CRITICAL: A detailed voice_persona for content writing**

The voice_persona is the most important part - it defines HOW to write content that RESONATES WITH THE TARGET AUDIENCE (ICP).

**CRITICAL: The voice must match what the ICP responds to, not just the company's brand voice.**

Consider the ICP (Ideal Customer Profile):
- Who are they? (role, seniority, technical level)
- What do they value? (speed, accuracy, innovation, ROI, simplicity)
- How do they consume content? (skim vs deep-read, mobile vs desktop)
- What tone resonates with them? (peer-to-peer, expert-to-learner, consultant-to-executive)
- What makes them trust content? (data, case studies, peer validation, credentials)

Examples of ICP-aligned voice:
- **ICP: CTOs/DevOps** → Direct, technical, code examples, benchmark data, "here's how it actually works"
- **ICP: Marketing Directors** → ROI-focused, competitive insights, "here's how to beat competitors"
- **ICP: Small Business Owners** → Practical, cost-conscious, "here's what you can do today"
- **ICP: Enterprise Procurement** → Risk mitigation, compliance, vendor comparison, "here's why this is safe"

The voice_persona must help writers AVOID robotic AI patterns like:
- Starting every section with "What is X?"
- Using "According to experts..." constantly
- Filler phrases like "In today's rapidly evolving landscape..."
- Over-hedging with "may", "might", "potentially"

Return ONLY valid JSON in exactly this format:
{
  "company_name": "Official company name",
  "company_url": "Normalized company website URL",
  "industry": "Primary industry category",
  "description": "Clear 2-3 sentence company description",
  "products": ["Product 1", "Product 2"],
  "target_audience": "Ideal customer profile description",
  "competitors": ["Competitor 1", "Competitor 2"],
  "tone": "Brand voice description (e.g., professional, friendly, authoritative)",
  "pain_points": ["Pain point 1", "Pain point 2"],
  "value_propositions": ["Value prop 1", "Value prop 2"],
  "use_cases": ["Use case 1", "Use case 2"],
  "content_themes": ["Theme 1", "Theme 2"],
  "voice_persona": {
    "icp_profile": "Brief description of the ICP this voice is tailored for. E.g., 'Technical decision-makers (CTOs, VPs of Engineering) at mid-market SaaS companies who value efficiency and proven solutions.'",
    "voice_style": "2-3 sentence description of the writing voice that resonates with this ICP. E.g., 'Peer-to-peer technical conversation. Direct, data-backed, respects their time and expertise. Avoids marketing fluff - they see through it immediately.'",
    "language_style": {
      "formality": "Level of formality (casual/professional/formal) that resonates with ICP",
      "complexity": "Vocabulary complexity appropriate for ICP (simple/moderate/technical/expert)",
      "sentence_length": "Preferred sentence structure (short and punchy / mixed / detailed)",
      "perspective": "How to address reader (peer-to-peer / expert-to-learner / consultant-to-executive)"
    },
    "sentence_patterns": [
      "Lead with insights, not setup - ICP has limited time",
      "Mix short punchy sentences with detailed explanations where depth matters",
      "Use concrete examples before abstract concepts - ICP wants practical value"
    ],
    "vocabulary_level": "Description of technical vocabulary expectations based on ICP expertise. E.g., 'Technical terms used freely - this audience knows them. Define only emerging/niche terms.'",
    "authority_signals": [
      "What makes this ICP trust content (analyst reports, benchmarks, peer case studies, etc.)",
      "Types of proof points that resonate (ROI data, implementation timelines, risk mitigation)",
      "Industry-specific credibility markers for this audience"
    ],
    "do_list": [
      "Specific behaviors that resonate with this ICP",
      "E.g., 'Lead with the business impact before technical details'",
      "E.g., 'Include comparison tables - they're evaluating options'",
      "E.g., 'Address objections they'll face when presenting to leadership'"
    ],
    "dont_list": [
      "Anti-patterns that turn off this ICP",
      "E.g., 'Don't start every section with a question - feels like clickbait to technical readers'",
      "E.g., 'Don't use filler phrases - they signal lack of substance'",
      "E.g., 'Don't oversimplify - it's condescending to experts'"
    ],
    "example_phrases": [
      "Phrases that capture the right tone for this ICP",
      "E.g., 'Here's what the benchmark data actually shows:'",
      "E.g., 'The implementation reality is...'",
      "E.g., 'Your team will need to account for...'"
    ],
    "opening_styles": [
      "Section openers that engage this ICP",
      "E.g., 'Start with a counterintuitive finding'",
      "E.g., 'Open with a real production incident'",
      "E.g., 'Lead with the ROI calculation'"
    ]
  }
}

Analyze: ${normalizedUrl}`

      const result = await model.generateContent(prompt)
      const responseText = result.response.text()

      console.log('[ANALYZE] Raw response length:', responseText.length)
      console.log('[ANALYZE] Raw response preview:', responseText.substring(0, 500))

      // Parse and validate JSON response
      let jsonText = responseText.trim()

      // Extract JSON from markdown code blocks if present
      if (jsonText.includes('```json')) {
        const parts = jsonText.split('```json')
        if (parts.length > 1) {
          jsonText = parts[1].split('```')[0].trim()
        }
      } else if (jsonText.includes('```')) {
        const parts = jsonText.split('```')
        if (parts.length > 1) {
          jsonText = parts[1].split('```')[0].trim()
        }
      }

      // Try to find JSON object if not already valid
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonText = jsonMatch[0]
        } else {
          // Model returned non-JSON (probably an error message)
          console.log('[ANALYZE] No JSON found in response, model returned:', jsonText.substring(0, 200))
          return NextResponse.json({
            error: 'Could not analyze website',
            message: jsonText.substring(0, 500)
          }, { status: 422 })
        }
      }

      const data = JSON.parse(jsonText)

      // Check if response contains an error field (model couldn't find company)
      if (data.error && !data.company_name) {
        console.log('[ANALYZE] Model returned error:', data.error)
        return NextResponse.json(data, { status: 422 })
      }

      console.log('[ANALYZE] Successfully analyzed:', data.company_name || 'Unknown')
      return NextResponse.json(data)
    } catch (error) {
      console.error('[ANALYZE] Full error:', error)
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        console.error('[ANALYZE] Error message:', error.message)

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
