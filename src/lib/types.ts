/**
 * OpenContext API - TypeScript type definitions
 */

/**
 * Language style preferences tailored to the ICP
 */
export interface LanguageStyle {
  /** Level of formality (casual/professional/formal) */
  formality: string
  /** Vocabulary complexity (simple/moderate/technical/expert) */
  complexity: string
  /** Sentence structure preference */
  sentence_length: string
  /** How to address the reader */
  perspective: string
}

/**
 * Voice Persona - Generated writing style guidelines tailored to the ICP.
 * This is dynamically created based on company AND target audience analysis
 * to ensure content resonates with the intended readers.
 */
export interface VoicePersona {
  /** Brief description of the ICP this voice is tailored for */
  icp_profile: string
  /** Core voice style that resonates with this ICP */
  voice_style: string
  /** Language style preferences for this audience */
  language_style: LanguageStyle
  /** Specific writing patterns to follow */
  sentence_patterns: string[]
  /** Vocabulary guidance based on ICP expertise */
  vocabulary_level: string
  /** What makes this ICP trust content */
  authority_signals: string[]
  /** Behaviors that resonate with this ICP */
  do_list: string[]
  /** Anti-patterns that turn off this ICP */
  dont_list: string[]
  /** Example phrases that capture the right tone for this ICP */
  example_phrases: string[]
  /** Section openers that engage this ICP */
  opening_styles: string[]
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
  /** Dynamically generated writing persona based on company/industry analysis */
  voice_persona: VoicePersona
}

export interface AnalysisRequest {
  url: string
  apiKey?: string
}