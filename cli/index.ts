#!/usr/bin/env node

/**
 * OpenContext CLI - AI-Powered Company Analysis from your terminal
 * Analyze any company website and extract comprehensive context for content generation
 *
 * Calls Gemini API directly - no server needed!
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import boxen from 'boxen'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { GoogleGenerativeAI } from '@google/generative-ai'

const VERSION = '2.0.0'
const CONFIG_DIR = path.join(os.homedir(), '.opencontext')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

// ASCII Logo
const LOGO = `
${chalk.cyan.bold(`
  ╔═══════════════════════════════════════════════════════════════════════╗
  ║                                                                       ║
  ║   ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ███╗   ██╗████████╗
  ║  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝
  ║  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██╔██╗ ██║   ██║
  ║  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║   ██║██║╚██╗██║   ██║
  ║  ╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗╚██████╔╝██║ ╚████║   ██║
  ║   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝
  ║                                                                       ║
  ║`)}${chalk.white('               ✨ AI-Powered Company Analysis ✨')}${chalk.cyan.bold(`               ║
  ║                                                                       ║
  ╚═══════════════════════════════════════════════════════════════════════╝
`)}
`

// Interfaces
interface Config {
  geminiKey: string
}

interface AnalysisResult {
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
  voice_persona?: {
    icp_profile: string
    voice_style: string
    language_style: {
      formality: string
      complexity: string
      sentence_length: string
      perspective: string
    }
    do_list: string[]
    dont_list: string[]
    example_phrases: string[]
  }
}

// Config management
function loadConfig(): Config {
  const defaults: Config = {
    geminiKey: ''
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      return { ...defaults, ...saved }
    }
  } catch {}

  return defaults
}

function saveConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// Display helpers
function printLogo(): void {
  console.log(LOGO)
}

function printSuccess(message: string): void {
  console.log(chalk.green('✓'), message)
}

function printError(message: string): void {
  console.log(chalk.red('✗'), message)
}

function printInfo(message: string): void {
  console.log(chalk.cyan('ℹ'), message)
}

function printWarning(message: string): void {
  console.log(chalk.yellow('⚠'), message)
}

// Direct Gemini API call - no server needed!
async function analyzeUrl(url: string, config: Config): Promise<AnalysisResult> {
  if (!config.geminiKey) {
    throw new Error(
      'Gemini API key not configured.\n\n' +
      '   Run: opencontext config\n\n' +
      '   Get your free API key at:\n' +
      '   https://aistudio.google.com/apikey'
    )
  }

  // Normalize URL
  const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(config.geminiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json'
    }
  })

  const prompt = `You are an expert business analyst. Analyze the company website at ${normalizedUrl} and extract comprehensive company context.

IMPORTANT: Search the web for real information about this company. Do NOT hallucinate.

Return ONLY valid JSON:
{
  "company_name": "Official company name",
  "company_url": "${normalizedUrl}",
  "industry": "Primary industry",
  "description": "2-3 sentence description",
  "products": ["Product 1", "Product 2"],
  "target_audience": "Ideal customer profile",
  "competitors": ["Competitor 1", "Competitor 2"],
  "tone": "Brand voice description",
  "pain_points": ["Pain point 1", "Pain point 2"],
  "value_propositions": ["Value prop 1", "Value prop 2"],
  "use_cases": ["Use case 1", "Use case 2"],
  "content_themes": ["Theme 1", "Theme 2"],
  "voice_persona": {
    "icp_profile": "Who is the ideal reader (role, seniority, what they value)",
    "voice_style": "How to write for this audience (tone, approach)",
    "language_style": {
      "formality": "casual/professional/formal",
      "complexity": "simple/moderate/technical",
      "sentence_length": "short/mixed/detailed",
      "perspective": "peer-to-peer/expert-to-learner"
    },
    "do_list": ["Do this", "Do that"],
    "dont_list": ["Don't do this", "Avoid that"],
    "example_phrases": ["Example phrase 1", "Example phrase 2"]
  }
}

Analyze: ${normalizedUrl}`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Parse JSON from response
    let jsonText = responseText.trim()

    // Extract from code blocks if present
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim()
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim()
    }

    // Find JSON object
    if (!jsonText.startsWith('{')) {
      const match = jsonText.match(/\{[\s\S]*\}/)
      if (match) jsonText = match[0]
    }

    return JSON.parse(jsonText) as AnalysisResult
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid Gemini API key. Get a new one at: https://aistudio.google.com/apikey')
      }
      throw error
    }
    throw new Error('Failed to analyze URL')
  }
}

// Format output
function formatAnalysisResult(result: AnalysisResult): string {
  const sections: string[] = []

  sections.push(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════════'))
  sections.push(chalk.cyan.bold(`  ${result.company_name.toUpperCase()}`))
  sections.push(chalk.cyan.bold('═══════════════════════════════════════════════════════════════\n'))

  sections.push(chalk.white.bold('📍 Basic Info'))
  sections.push(chalk.gray('─────────────────────────────────────────'))
  sections.push(`   ${chalk.dim('Website:')}    ${result.company_url}`)
  sections.push(`   ${chalk.dim('Industry:')}   ${result.industry}`)
  sections.push(`   ${chalk.dim('Summary:')}    ${result.description}`)
  sections.push('')

  if (result.products?.length) {
    sections.push(chalk.white.bold('📦 Products & Services'))
    sections.push(chalk.gray('─────────────────────────────────────────'))
    result.products.forEach(p => sections.push(`   • ${p}`))
    sections.push('')
  }

  sections.push(chalk.white.bold('🎯 Target Audience'))
  sections.push(chalk.gray('─────────────────────────────────────────'))
  sections.push(`   ${result.target_audience}`)
  sections.push('')

  if (result.pain_points?.length) {
    sections.push(chalk.white.bold('💢 Pain Points Addressed'))
    sections.push(chalk.gray('─────────────────────────────────────────'))
    result.pain_points.forEach(p => sections.push(`   • ${p}`))
    sections.push('')
  }

  if (result.value_propositions?.length) {
    sections.push(chalk.white.bold('✨ Value Propositions'))
    sections.push(chalk.gray('─────────────────────────────────────────'))
    result.value_propositions.forEach(v => sections.push(`   • ${v}`))
    sections.push('')
  }

  if (result.competitors?.length) {
    sections.push(chalk.white.bold('🏁 Competitors'))
    sections.push(chalk.gray('─────────────────────────────────────────'))
    sections.push(`   ${result.competitors.join(' • ')}`)
    sections.push('')
  }

  sections.push(chalk.white.bold('🎨 Brand Voice'))
  sections.push(chalk.gray('─────────────────────────────────────────'))
  sections.push(`   ${result.tone}`)
  sections.push('')

  if (result.voice_persona) {
    sections.push(chalk.yellow.bold('✍️  VOICE PERSONA (for content writers)'))
    sections.push(chalk.gray('─────────────────────────────────────────'))
    sections.push(chalk.yellow(`   ICP Profile: ${result.voice_persona.icp_profile}`))
    sections.push('')
    sections.push(`   ${chalk.dim('Style:')} ${result.voice_persona.voice_style}`)
    sections.push('')

    if (result.voice_persona.language_style) {
      const ls = result.voice_persona.language_style
      sections.push(`   ${chalk.dim('Formality:')} ${ls.formality}  |  ${chalk.dim('Complexity:')} ${ls.complexity}`)
      sections.push(`   ${chalk.dim('Perspective:')} ${ls.perspective}`)
    }
    sections.push('')

    if (result.voice_persona.do_list?.length) {
      sections.push(chalk.green('   ✓ DO:'))
      result.voice_persona.do_list.slice(0, 4).forEach(d => sections.push(`     • ${d}`))
    }

    if (result.voice_persona.dont_list?.length) {
      sections.push(chalk.red('\n   ✗ DON\'T:'))
      result.voice_persona.dont_list.slice(0, 4).forEach(d => sections.push(`     • ${d}`))
    }

    if (result.voice_persona.example_phrases?.length) {
      sections.push(chalk.blue('\n   📝 Example Phrases:'))
      result.voice_persona.example_phrases.slice(0, 3).forEach(p =>
        sections.push(`     "${p}"`)
      )
    }
    sections.push('')
  }

  sections.push(chalk.cyan('═══════════════════════════════════════════════════════════════\n'))

  return sections.join('\n')
}

// Get Downloads folder path
function getDownloadsPath(): string {
  return path.join(os.homedir(), 'Downloads')
}

// Generate filename from company name
function generateFilename(companyName: string, ext: string = 'json'): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + `-context.${ext}`
}

// Convert result to CSV format (columns = fields, one row of data)
function resultToCSV(result: AnalysisResult): string {
  // Helper to escape CSV values
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`

  // Define headers and values
  const headers: string[] = []
  const values: string[] = []

  // Basic fields
  headers.push('Company Name', 'Website', 'Industry', 'Description', 'Target Audience', 'Brand Tone')
  values.push(
    escape(result.company_name),
    escape(result.company_url),
    escape(result.industry),
    escape(result.description),
    escape(result.target_audience),
    escape(result.tone)
  )

  // Arrays as semicolon-separated
  headers.push('Products', 'Competitors', 'Pain Points', 'Value Propositions', 'Use Cases', 'Content Themes')
  values.push(
    escape(result.products?.join('; ') || ''),
    escape(result.competitors?.join('; ') || ''),
    escape(result.pain_points?.join('; ') || ''),
    escape(result.value_propositions?.join('; ') || ''),
    escape(result.use_cases?.join('; ') || ''),
    escape(result.content_themes?.join('; ') || '')
  )

  // Voice persona
  if (result.voice_persona) {
    headers.push('ICP Profile', 'Voice Style', 'Do List', 'Dont List', 'Example Phrases')
    values.push(
      escape(result.voice_persona.icp_profile || ''),
      escape(result.voice_persona.voice_style || ''),
      escape(result.voice_persona.do_list?.join('; ') || ''),
      escape(result.voice_persona.dont_list?.join('; ') || ''),
      escape(result.voice_persona.example_phrases?.join('; ') || '')
    )
  }

  return headers.join(',') + '\n' + values.join(',')
}

// Commands
async function analyzeCommand(url: string, options: { output?: string; json?: boolean }): Promise<void> {
  const config = loadConfig()

  const spinner = ora({
    text: `Analyzing ${chalk.cyan(url)}...`,
    color: 'cyan'
  }).start()

  try {
    const result = await analyzeUrl(url, config)
    spinner.succeed(`Analysis complete for ${chalk.cyan(result.company_name)}`)

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(formatAnalysisResult(result))
    }

    // Always save to Downloads (both JSON and CSV)
    const downloadsDir = getDownloadsPath()
    const jsonPath = options.output || path.join(downloadsDir, generateFilename(result.company_name, 'json'))
    const csvPath = jsonPath.replace(/\.json$/, '.csv')

    const dir = path.dirname(jsonPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Save JSON
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2))

    // Save CSV
    fs.writeFileSync(csvPath, resultToCSV(result))

    console.log()
    console.log(boxen(
      chalk.green.bold('Saved!') + '\n\n' +
      chalk.dim('JSON: ') + chalk.white(jsonPath) + '\n' +
      chalk.dim('CSV:  ') + chalk.white(csvPath),
      { padding: 1, borderColor: 'green', borderStyle: 'round' }
    ))

  } catch (error) {
    spinner.fail('Analysis failed')
    printError(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

async function batchCommand(inputFile: string, options: { outputDir?: string }): Promise<void> {
  const config = loadConfig()

  if (!fs.existsSync(inputFile)) {
    printError(`File not found: ${inputFile}`)
    process.exit(1)
  }

  const content = fs.readFileSync(inputFile, 'utf-8')
  let urls: string[] = []

  // Parse file - support JSON array, newline-separated, or CSV
  if (inputFile.endsWith('.json')) {
    const data = JSON.parse(content)
    urls = Array.isArray(data)
      ? data.map((item: any) => item.url || item.website || item)
      : [data.url || data.website]
  } else if (inputFile.endsWith('.csv')) {
    const lines = content.split('\n').filter(l => l.trim())
    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes('url') ? 1 : 0
    urls = lines.slice(startIndex).map(line => {
      const parts = line.split(',')
      return parts[0].trim().replace(/"/g, '')
    })
  } else {
    // Plain text, one URL per line
    urls = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  }

  urls = urls.filter(u => u && u.length > 0)

  if (urls.length === 0) {
    printError('No URLs found in file')
    process.exit(1)
  }

  console.log()
  console.log(boxen(
    chalk.white.bold(`Batch Analysis\n\n`) +
    chalk.dim(`Found ${chalk.cyan(urls.length.toString())} URLs to analyze`),
    { padding: 1, borderColor: 'cyan', borderStyle: 'round' }
  ))
  console.log()

  const outputDir = options.outputDir || path.join(getDownloadsPath(), 'opencontext-reports')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  let successful = 0
  let failed = 0

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const progress = `[${i + 1}/${urls.length}]`

    const spinner = ora({
      text: `${chalk.dim(progress)} Analyzing ${chalk.cyan(url)}`,
      color: 'cyan'
    }).start()

    try {
      const result = await analyzeUrl(url, config)

      // Generate filename from company name
      const filename = result.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '.json'

      const outputPath = path.join(outputDir, filename)
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

      spinner.succeed(`${chalk.dim(progress)} ${chalk.green(result.company_name)} → ${filename}`)
      successful++

    } catch (error) {
      spinner.fail(`${chalk.dim(progress)} ${chalk.red(url)}: ${error instanceof Error ? error.message : 'Failed'}`)
      failed++
    }

    // Small delay between requests
    if (i < urls.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log()
  console.log(boxen(
    chalk.white.bold('Batch Complete\n\n') +
    chalk.green(`✓ ${successful} successful\n`) +
    (failed > 0 ? chalk.red(`✗ ${failed} failed\n`) : '') +
    chalk.dim(`\nOutput: ${outputDir}`),
    { padding: 1, borderColor: successful > 0 ? 'green' : 'red', borderStyle: 'round' }
  ))
}

async function configCommand(): Promise<void> {
  printLogo()
  console.log(chalk.white.bold('  Configuration\n'))

  const config = loadConfig()

  console.log(chalk.dim('  Get your free Gemini API key at:'))
  console.log(chalk.cyan('  https://aistudio.google.com/apikey\n'))

  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'geminiKey',
      message: 'Gemini API Key:',
      default: config.geminiKey || '',
      validate: (input: string) => input.trim().length > 0 || 'API key is required'
    }
  ])

  saveConfig(answers)
  console.log()
  printSuccess('Configuration saved!')
  console.log(chalk.dim(`  Config file: ${CONFIG_FILE}`))
  console.log()
  console.log(chalk.green('  Ready! Run: opencontext analyze <url>'))
}

async function interactiveMode(): Promise<void> {
  printLogo()

  const config = loadConfig()

  // Check if API key is configured
  if (!config.geminiKey) {
    console.log(boxen(
      chalk.yellow.bold('Setup Required\n\n') +
      chalk.white('You need a Gemini API key to use OpenContext.\n\n') +
      chalk.dim('Get your free key at:\n') +
      chalk.cyan('https://aistudio.google.com/apikey'),
      { padding: 1, borderColor: 'yellow', borderStyle: 'round' }
    ))
    console.log()

    await configCommand()
    return interactiveMode() // Restart after config
  }

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔍  Analyze a company website', value: 'analyze' },
          { name: '📦  Batch analyze multiple URLs', value: 'batch' },
          { name: '⚙️   Configure API key', value: 'config' },
          new inquirer.Separator(),
          { name: '👋  Exit', value: 'exit' }
        ]
      }
    ])

    console.log()

    switch (action) {
      case 'analyze': {
        const { url } = await inquirer.prompt([
          {
            type: 'input',
            name: 'url',
            message: 'Enter company URL:',
            validate: (input: string) => input.trim().length > 0 || 'URL is required'
          }
        ])

        console.log()
        await analyzeCommand(url.trim(), {})
        break
      }

      case 'batch': {
        // List available files
        const files = fs.readdirSync('.').filter(f =>
          f.endsWith('.json') || f.endsWith('.csv') || f.endsWith('.txt')
        )

        if (files.length === 0) {
          printWarning('No input files found in current directory')
          console.log(chalk.dim('  Supported formats: .json, .csv, .txt (one URL per line)'))
          break
        }

        const { inputFile } = await inquirer.prompt([
          {
            type: 'list',
            name: 'inputFile',
            message: 'Select input file:',
            choices: files
          }
        ])

        console.log()
        await batchCommand(inputFile, {})
        break
      }

      case 'config':
        await configCommand()
        break

      case 'exit':
        console.log(chalk.cyan('\n  Thanks for using OpenContext! 👋\n'))
        process.exit(0)
    }

    console.log()
  }
}

// Main program
const program = new Command()

program
  .name('opencontext')
  .description('AI-Powered Company Analysis from your terminal')
  .version(VERSION)

program
  .command('analyze <url>')
  .description('Analyze a company website')
  .option('-o, --output <path>', 'Save result to file')
  .option('-j, --json', 'Output raw JSON')
  .action(analyzeCommand)

program
  .command('batch <file>')
  .description('Batch analyze URLs from a file (JSON/CSV/TXT)')
  .option('-d, --output-dir <path>', 'Output directory for results')
  .action(batchCommand)

program
  .command('config')
  .description('Configure your Gemini API key')
  .action(configCommand)

program
  .command('interactive')
  .description('Start interactive mode')
  .action(interactiveMode)

// Default to interactive mode if no command given
if (process.argv.length <= 2) {
  interactiveMode()
} else {
  program.parse()
}
