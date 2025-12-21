#!/usr/bin/env node

/**
 * OpenContext CLI - AI-Powered Company Analysis from your terminal
 * Analyze any company website and extract comprehensive context for content generation
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import boxen from 'boxen'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const VERSION = '1.0.0'
const CONFIG_DIR = path.join(os.homedir(), '.opencontext')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

// ASCII Logo
const LOGO = `
${chalk.cyan.bold(`
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║                                                                          ║
    ║     ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ███╗   ██╗████████╗║
    ║    ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝║
    ║    ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██╔██╗ ██║   ██║   ║
    ║    ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║   ██║██║╚██╗██║   ██║   ║
    ║    ╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗╚██████╔╝██║ ╚████║   ██║   ║
    ║     ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ║
    ║                                                                          ║
    ║              ${chalk.white('✨ AI-Powered Company Analysis ✨')}                       ║
    ║                                                                          ║
    ╚══════════════════════════════════════════════════════════════════════════╝
`)}
`

// Interfaces
interface Config {
  apiUrl: string
  apiKey: string
  geminiKey?: string
  outputDir: string
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
    apiUrl: 'http://localhost:3000',
    apiKey: '',
    outputDir: './context-reports'
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

// API calls
async function analyzeUrl(url: string, config: Config): Promise<AnalysisResult> {
  const endpoint = `${config.apiUrl}/api/analyze`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const body: Record<string, string> = { url }
  if (config.geminiKey) {
    body.apiKey = config.geminiKey
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string; message?: string }
    throw new Error(error.error || error.message || `HTTP ${response.status}`)
  }

  return response.json() as Promise<AnalysisResult>
}

async function checkHealth(config: Config): Promise<boolean> {
  try {
    const response = await fetch(`${config.apiUrl}/api/health`)
    return response.ok
  } catch {
    return false
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

// Commands
async function analyzeCommand(url: string, options: { output?: string; json?: boolean }): Promise<void> {
  const config = loadConfig()

  if (!config.apiUrl) {
    printError('API URL not configured. Run: opencontext config')
    process.exit(1)
  }

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

    // Save to file if requested
    if (options.output) {
      const outputPath = options.output
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
      printSuccess(`Saved to ${outputPath}`)
    }

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

  const outputDir = options.outputDir || config.outputDir || './context-reports'
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

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL:',
      default: config.apiUrl || 'http://localhost:3000'
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'OpenContext API Key (optional):',
      default: config.apiKey || ''
    },
    {
      type: 'password',
      name: 'geminiKey',
      message: 'Gemini API Key (if self-hosting):',
      default: config.geminiKey || ''
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Default output directory:',
      default: config.outputDir || './context-reports'
    }
  ])

  saveConfig(answers)
  console.log()
  printSuccess('Configuration saved!')
  console.log(chalk.dim(`  Config file: ${CONFIG_FILE}`))
}

async function healthCommand(): Promise<void> {
  const config = loadConfig()

  console.log()
  console.log(chalk.white.bold('  Checking API health...\n'))

  const spinner = ora({
    text: `Connecting to ${config.apiUrl}`,
    color: 'cyan'
  }).start()

  const healthy = await checkHealth(config)

  if (healthy) {
    spinner.succeed(`API is ${chalk.green('healthy')}`)
    console.log(chalk.dim(`  Endpoint: ${config.apiUrl}`))
  } else {
    spinner.fail(`API is ${chalk.red('unreachable')}`)
    console.log()
    printWarning('Make sure the API server is running')
    console.log(chalk.dim('  Try: npm run dev (in the opencontext directory)'))
    console.log(chalk.dim('  Or update the API URL: opencontext config'))
  }
}

async function interactiveMode(): Promise<void> {
  printLogo()

  const config = loadConfig()

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔍  Analyze a company website', value: 'analyze' },
          { name: '📦  Batch analyze multiple URLs', value: 'batch' },
          { name: '⚙️   Configure settings', value: 'config' },
          { name: '❤️   Check API health', value: 'health' },
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

        const { saveToFile } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'saveToFile',
            message: 'Save result to file?',
            default: true
          }
        ])

        let outputPath: string | undefined
        if (saveToFile) {
          const { path: outPath } = await inquirer.prompt([
            {
              type: 'input',
              name: 'path',
              message: 'Output file path:',
              default: './context-report.json'
            }
          ])
          outputPath = outPath
        }

        console.log()
        await analyzeCommand(url.trim(), { output: outputPath })
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

        const { inputFile, outputDir } = await inquirer.prompt([
          {
            type: 'list',
            name: 'inputFile',
            message: 'Select input file:',
            choices: files
          },
          {
            type: 'input',
            name: 'outputDir',
            message: 'Output directory:',
            default: config.outputDir || './context-reports'
          }
        ])

        console.log()
        await batchCommand(inputFile, { outputDir })
        break
      }

      case 'config':
        await configCommand()
        break

      case 'health':
        await healthCommand()
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
  .description('Configure API settings')
  .action(configCommand)

program
  .command('health')
  .description('Check API connection')
  .action(healthCommand)

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
