import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * POST /api/analyze
 * Analyzes a website URL and extracts company context using Gemini 3 Pro Preview
 * Uses Google Search grounding for real URL context (no hallucination)
 */

export const maxDuration = 60

// Simple in-memory rate limiting (for production, use Redis/Upstash KV)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 20 // requests per minute
const RATE_WINDOW_MS = 60 * 1000 // 1 minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }

  if (!record || now > record.resetTime) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW_MS }
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetIn: record.resetTime - now }
}

// SSRF Protection: Validate URL to prevent internal network access
function validateUrl(input: string): { valid: boolean; url?: string; error?: string } {
  const normalized = input.trim().startsWith('http') ? input.trim() : `https://${input.trim()}`

  try {
    const url = new URL(normalized)

    // Block non-HTTP protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS URLs allowed' }
    }

    // Block private/local IPs and hostnames
    const hostname = url.hostname.toLowerCase()

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { valid: false, error: 'Localhost URLs not allowed' }
    }

    // Block private IPv4 ranges
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number)
      // Validate octets are in valid range
      if (a > 255 || b > 255 || c > 255 || d > 255) {
        return { valid: false, error: 'Invalid IP address' }
      }
      // 10.0.0.0/8
      if (a === 10) return { valid: false, error: 'Private IP addresses not allowed' }
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return { valid: false, error: 'Private IP addresses not allowed' }
      // 192.168.0.0/16
      if (a === 192 && b === 168) return { valid: false, error: 'Private IP addresses not allowed' }
      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return { valid: false, error: 'Link-local addresses not allowed' }
      // 127.0.0.0/8 (loopback)
      if (a === 127) return { valid: false, error: 'Loopback addresses not allowed' }
    }

    // Block IPv6 addresses (including bracketed notation)
    const ipv6Match = hostname.match(/^\[(.+)\]$/)
    if (ipv6Match) {
      const ipv6 = ipv6Match[1].toLowerCase()
      // Block IPv6 loopback
      if (ipv6 === '::1') return { valid: false, error: 'Loopback addresses not allowed' }
      // Block IPv4-mapped IPv6 loopback (::ffff:127.x.x.x)
      if (ipv6.startsWith('::ffff:127.')) return { valid: false, error: 'Loopback addresses not allowed' }
      // Block IPv6 link-local (fe80::)
      if (ipv6.startsWith('fe80:')) return { valid: false, error: 'Link-local addresses not allowed' }
      // Block IPv6 unique local addresses (fc00::/7 = fc00:: and fd00::)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return { valid: false, error: 'Private IP addresses not allowed' }
      // Block IPv4-mapped private addresses
      if (ipv6.startsWith('::ffff:10.')) return { valid: false, error: 'Private IP addresses not allowed' }
      if (ipv6.startsWith('::ffff:192.168.')) return { valid: false, error: 'Private IP addresses not allowed' }
      // Block IPv4-mapped 172.16-31.x.x
      const ipv4MappedMatch = ipv6.match(/^::ffff:(\d+)\.(\d+)\./)
      if (ipv4MappedMatch) {
        const [, first, second] = ipv4MappedMatch.map(Number)
        if (first === 172 && second >= 16 && second <= 31) {
          return { valid: false, error: 'Private IP addresses not allowed' }
        }
      }
    }

    // Block internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.lan')) {
      return { valid: false, error: 'Internal hostnames not allowed' }
    }

    return { valid: true, url: normalized }
  } catch (err) {
    return { valid: false, error: 'Invalid URL format' }
  }
}

// Removed OPENCONTEXT_API_KEY auth system - stateless API for open source
// Users provide their own Gemini API key (in body or environment)

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Rate limiting - use IP or forwarded header as identifier
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const rateLimit = checkRateLimit(clientIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.', resetIn: Math.ceil(rateLimit.resetIn / 1000) },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
          }
        }
      )
    }

    const body = await request.json()
    const { url, apiKey: clientApiKey } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Use Gemini API key from environment OR request body (user's choice)
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey

    if (!apiKey || typeof apiKey !== 'string') {
      console.error('[ANALYZE] No GEMINI_API_KEY environment variable set and no apiKey in request body')
      return NextResponse.json(
        { error: 'Gemini API key required. Provide "apiKey" in request body or set GEMINI_API_KEY environment variable.' },
        { status: 400 }
      )
    }

    // Validate and normalize URL (SSRF protection)
    const urlValidation = validateUrl(url)
    if (!urlValidation.valid || !urlValidation.url) {
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid URL' },
        { status: 400 }
      )
    }
    const normalizedUrl = urlValidation.url

    // Log request (avoid exposing full URL in logs)

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

      // Response received (avoid logging content in production)

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
          return NextResponse.json({
            error: 'Could not analyze website',
            message: jsonText.substring(0, 500)
          }, { status: 422 })
        }
      }

      const data = JSON.parse(jsonText)

      // Check if response contains an error field (model couldn't find company)
      if (data.error && !data.company_name) {
        return NextResponse.json(data, { status: 422 })
      }

      return NextResponse.json(data)
    } catch (error) {
      // Log error type only (avoid exposing sensitive details)
      const errorType = error instanceof Error ? error.constructor.name : 'Unknown'
      console.error(`[ANALYZE] Error type: ${errorType}`)

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
