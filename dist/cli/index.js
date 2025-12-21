#!/usr/bin/env node
"use strict";
/**
 * OpenContext CLI - AI-Powered Company Analysis from your terminal
 * Analyze any company website and extract comprehensive context for content generation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const boxen_1 = __importDefault(require("boxen"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const VERSION = '1.0.0';
const CONFIG_DIR = path.join(os.homedir(), '.opencontext');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
// ASCII Logo
const LOGO = `
${chalk_1.default.cyan.bold(`
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║                                                                          ║
    ║     ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ███╗   ██╗████████╗║
    ║    ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝║
    ║    ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██╔██╗ ██║   ██║   ║
    ║    ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║   ██║██║╚██╗██║   ██║   ║
    ║    ╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗╚██████╔╝██║ ╚████║   ██║   ║
    ║     ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ║
    ║                                                                          ║
    ║              ${chalk_1.default.white('✨ AI-Powered Company Analysis ✨')}                       ║
    ║                                                                          ║
    ╚══════════════════════════════════════════════════════════════════════════╝
`)}
`;
// Config management
function loadConfig() {
    const defaults = {
        apiUrl: 'http://localhost:3000',
        apiKey: '',
        outputDir: './context-reports'
    };
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            return { ...defaults, ...saved };
        }
    }
    catch { }
    return defaults;
}
function saveConfig(config) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
// Display helpers
function printLogo() {
    console.log(LOGO);
}
function printSuccess(message) {
    console.log(chalk_1.default.green('✓'), message);
}
function printError(message) {
    console.log(chalk_1.default.red('✗'), message);
}
function printInfo(message) {
    console.log(chalk_1.default.cyan('ℹ'), message);
}
function printWarning(message) {
    console.log(chalk_1.default.yellow('⚠'), message);
}
// API calls
async function analyzeUrl(url, config) {
    const endpoint = `${config.apiUrl}/api/analyze`;
    const headers = {
        'Content-Type': 'application/json'
    };
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    const body = { url };
    if (config.geminiKey) {
        body.apiKey = config.geminiKey;
    }
    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }
    return response.json();
}
async function checkHealth(config) {
    try {
        const response = await fetch(`${config.apiUrl}/api/health`);
        return response.ok;
    }
    catch {
        return false;
    }
}
// Format output
function formatAnalysisResult(result) {
    const sections = [];
    sections.push(chalk_1.default.cyan.bold('\n═══════════════════════════════════════════════════════════════'));
    sections.push(chalk_1.default.cyan.bold(`  ${result.company_name.toUpperCase()}`));
    sections.push(chalk_1.default.cyan.bold('═══════════════════════════════════════════════════════════════\n'));
    sections.push(chalk_1.default.white.bold('📍 Basic Info'));
    sections.push(chalk_1.default.gray('─────────────────────────────────────────'));
    sections.push(`   ${chalk_1.default.dim('Website:')}    ${result.company_url}`);
    sections.push(`   ${chalk_1.default.dim('Industry:')}   ${result.industry}`);
    sections.push(`   ${chalk_1.default.dim('Summary:')}    ${result.description}`);
    sections.push('');
    if (result.products?.length) {
        sections.push(chalk_1.default.white.bold('📦 Products & Services'));
        sections.push(chalk_1.default.gray('─────────────────────────────────────────'));
        result.products.forEach(p => sections.push(`   • ${p}`));
        sections.push('');
    }
    sections.push(chalk_1.default.white.bold('🎯 Target Audience'));
    sections.push(chalk_1.default.gray('─────────────────────────────────────────'));
    sections.push(`   ${result.target_audience}`);
    sections.push('');
    if (result.pain_points?.length) {
        sections.push(chalk_1.default.white.bold('💢 Pain Points Addressed'));
        sections.push(chalk_1.default.gray('─────────────────────────────────────────'));
        result.pain_points.forEach(p => sections.push(`   • ${p}`));
        sections.push('');
    }
    if (result.value_propositions?.length) {
        sections.push(chalk_1.default.white.bold('✨ Value Propositions'));
        sections.push(chalk_1.default.gray('─────────────────────────────────────────'));
        result.value_propositions.forEach(v => sections.push(`   • ${v}`));
        sections.push('');
    }
    if (result.competitors?.length) {
        sections.push(chalk_1.default.white.bold('🏁 Competitors'));
        sections.push(chalk_1.default.gray('─────────────────────────────────────────'));
        sections.push(`   ${result.competitors.join(' • ')}`);
        sections.push('');
    }
    sections.push(chalk_1.default.white.bold('🎨 Brand Voice'));
    sections.push(chalk_1.default.gray('─────────────────────────────────────────'));
    sections.push(`   ${result.tone}`);
    sections.push('');
    if (result.voice_persona) {
        sections.push(chalk_1.default.yellow.bold('✍️  VOICE PERSONA (for content writers)'));
        sections.push(chalk_1.default.gray('─────────────────────────────────────────'));
        sections.push(chalk_1.default.yellow(`   ICP Profile: ${result.voice_persona.icp_profile}`));
        sections.push('');
        sections.push(`   ${chalk_1.default.dim('Style:')} ${result.voice_persona.voice_style}`);
        sections.push('');
        if (result.voice_persona.language_style) {
            const ls = result.voice_persona.language_style;
            sections.push(`   ${chalk_1.default.dim('Formality:')} ${ls.formality}  |  ${chalk_1.default.dim('Complexity:')} ${ls.complexity}`);
            sections.push(`   ${chalk_1.default.dim('Perspective:')} ${ls.perspective}`);
        }
        sections.push('');
        if (result.voice_persona.do_list?.length) {
            sections.push(chalk_1.default.green('   ✓ DO:'));
            result.voice_persona.do_list.slice(0, 4).forEach(d => sections.push(`     • ${d}`));
        }
        if (result.voice_persona.dont_list?.length) {
            sections.push(chalk_1.default.red('\n   ✗ DON\'T:'));
            result.voice_persona.dont_list.slice(0, 4).forEach(d => sections.push(`     • ${d}`));
        }
        if (result.voice_persona.example_phrases?.length) {
            sections.push(chalk_1.default.blue('\n   📝 Example Phrases:'));
            result.voice_persona.example_phrases.slice(0, 3).forEach(p => sections.push(`     "${p}"`));
        }
        sections.push('');
    }
    sections.push(chalk_1.default.cyan('═══════════════════════════════════════════════════════════════\n'));
    return sections.join('\n');
}
// Commands
async function analyzeCommand(url, options) {
    const config = loadConfig();
    if (!config.apiUrl) {
        printError('API URL not configured. Run: opencontext config');
        process.exit(1);
    }
    const spinner = (0, ora_1.default)({
        text: `Analyzing ${chalk_1.default.cyan(url)}...`,
        color: 'cyan'
    }).start();
    try {
        const result = await analyzeUrl(url, config);
        spinner.succeed(`Analysis complete for ${chalk_1.default.cyan(result.company_name)}`);
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            console.log(formatAnalysisResult(result));
        }
        // Save to file if requested
        if (options.output) {
            const outputPath = options.output;
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
            printSuccess(`Saved to ${outputPath}`);
        }
    }
    catch (error) {
        spinner.fail('Analysis failed');
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function batchCommand(inputFile, options) {
    const config = loadConfig();
    if (!fs.existsSync(inputFile)) {
        printError(`File not found: ${inputFile}`);
        process.exit(1);
    }
    const content = fs.readFileSync(inputFile, 'utf-8');
    let urls = [];
    // Parse file - support JSON array, newline-separated, or CSV
    if (inputFile.endsWith('.json')) {
        const data = JSON.parse(content);
        urls = Array.isArray(data)
            ? data.map((item) => item.url || item.website || item)
            : [data.url || data.website];
    }
    else if (inputFile.endsWith('.csv')) {
        const lines = content.split('\n').filter(l => l.trim());
        // Skip header if present
        const startIndex = lines[0].toLowerCase().includes('url') ? 1 : 0;
        urls = lines.slice(startIndex).map(line => {
            const parts = line.split(',');
            return parts[0].trim().replace(/"/g, '');
        });
    }
    else {
        // Plain text, one URL per line
        urls = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    }
    urls = urls.filter(u => u && u.length > 0);
    if (urls.length === 0) {
        printError('No URLs found in file');
        process.exit(1);
    }
    console.log();
    console.log((0, boxen_1.default)(chalk_1.default.white.bold(`Batch Analysis\n\n`) +
        chalk_1.default.dim(`Found ${chalk_1.default.cyan(urls.length.toString())} URLs to analyze`), { padding: 1, borderColor: 'cyan', borderStyle: 'round' }));
    console.log();
    const outputDir = options.outputDir || config.outputDir || './context-reports';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    let successful = 0;
    let failed = 0;
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const progress = `[${i + 1}/${urls.length}]`;
        const spinner = (0, ora_1.default)({
            text: `${chalk_1.default.dim(progress)} Analyzing ${chalk_1.default.cyan(url)}`,
            color: 'cyan'
        }).start();
        try {
            const result = await analyzeUrl(url, config);
            // Generate filename from company name
            const filename = result.company_name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') + '.json';
            const outputPath = path.join(outputDir, filename);
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
            spinner.succeed(`${chalk_1.default.dim(progress)} ${chalk_1.default.green(result.company_name)} → ${filename}`);
            successful++;
        }
        catch (error) {
            spinner.fail(`${chalk_1.default.dim(progress)} ${chalk_1.default.red(url)}: ${error instanceof Error ? error.message : 'Failed'}`);
            failed++;
        }
        // Small delay between requests
        if (i < urls.length - 1) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    console.log();
    console.log((0, boxen_1.default)(chalk_1.default.white.bold('Batch Complete\n\n') +
        chalk_1.default.green(`✓ ${successful} successful\n`) +
        (failed > 0 ? chalk_1.default.red(`✗ ${failed} failed\n`) : '') +
        chalk_1.default.dim(`\nOutput: ${outputDir}`), { padding: 1, borderColor: successful > 0 ? 'green' : 'red', borderStyle: 'round' }));
}
async function configCommand() {
    printLogo();
    console.log(chalk_1.default.white.bold('  Configuration\n'));
    const config = loadConfig();
    const answers = await inquirer_1.default.prompt([
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
    ]);
    saveConfig(answers);
    console.log();
    printSuccess('Configuration saved!');
    console.log(chalk_1.default.dim(`  Config file: ${CONFIG_FILE}`));
}
async function healthCommand() {
    const config = loadConfig();
    console.log();
    console.log(chalk_1.default.white.bold('  Checking API health...\n'));
    const spinner = (0, ora_1.default)({
        text: `Connecting to ${config.apiUrl}`,
        color: 'cyan'
    }).start();
    const healthy = await checkHealth(config);
    if (healthy) {
        spinner.succeed(`API is ${chalk_1.default.green('healthy')}`);
        console.log(chalk_1.default.dim(`  Endpoint: ${config.apiUrl}`));
    }
    else {
        spinner.fail(`API is ${chalk_1.default.red('unreachable')}`);
        console.log();
        printWarning('Make sure the API server is running');
        console.log(chalk_1.default.dim('  Try: npm run dev (in the opencontext directory)'));
        console.log(chalk_1.default.dim('  Or update the API URL: opencontext config'));
    }
}
async function interactiveMode() {
    printLogo();
    const config = loadConfig();
    while (true) {
        const { action } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: '🔍  Analyze a company website', value: 'analyze' },
                    { name: '📦  Batch analyze multiple URLs', value: 'batch' },
                    { name: '⚙️   Configure settings', value: 'config' },
                    { name: '❤️   Check API health', value: 'health' },
                    new inquirer_1.default.Separator(),
                    { name: '👋  Exit', value: 'exit' }
                ]
            }
        ]);
        console.log();
        switch (action) {
            case 'analyze': {
                const { url } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'url',
                        message: 'Enter company URL:',
                        validate: (input) => input.trim().length > 0 || 'URL is required'
                    }
                ]);
                const { saveToFile } = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'saveToFile',
                        message: 'Save result to file?',
                        default: true
                    }
                ]);
                let outputPath;
                if (saveToFile) {
                    const { path: outPath } = await inquirer_1.default.prompt([
                        {
                            type: 'input',
                            name: 'path',
                            message: 'Output file path:',
                            default: './context-report.json'
                        }
                    ]);
                    outputPath = outPath;
                }
                console.log();
                await analyzeCommand(url.trim(), { output: outputPath });
                break;
            }
            case 'batch': {
                // List available files
                const files = fs.readdirSync('.').filter(f => f.endsWith('.json') || f.endsWith('.csv') || f.endsWith('.txt'));
                if (files.length === 0) {
                    printWarning('No input files found in current directory');
                    console.log(chalk_1.default.dim('  Supported formats: .json, .csv, .txt (one URL per line)'));
                    break;
                }
                const { inputFile, outputDir } = await inquirer_1.default.prompt([
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
                ]);
                console.log();
                await batchCommand(inputFile, { outputDir });
                break;
            }
            case 'config':
                await configCommand();
                break;
            case 'health':
                await healthCommand();
                break;
            case 'exit':
                console.log(chalk_1.default.cyan('\n  Thanks for using OpenContext! 👋\n'));
                process.exit(0);
        }
        console.log();
    }
}
// Main program
const program = new commander_1.Command();
program
    .name('opencontext')
    .description('AI-Powered Company Analysis from your terminal')
    .version(VERSION);
program
    .command('analyze <url>')
    .description('Analyze a company website')
    .option('-o, --output <path>', 'Save result to file')
    .option('-j, --json', 'Output raw JSON')
    .action(analyzeCommand);
program
    .command('batch <file>')
    .description('Batch analyze URLs from a file (JSON/CSV/TXT)')
    .option('-d, --output-dir <path>', 'Output directory for results')
    .action(batchCommand);
program
    .command('config')
    .description('Configure API settings')
    .action(configCommand);
program
    .command('health')
    .description('Check API connection')
    .action(healthCommand);
program
    .command('interactive')
    .description('Start interactive mode')
    .action(interactiveMode);
// Default to interactive mode if no command given
if (process.argv.length <= 2) {
    interactiveMode();
}
else {
    program.parse();
}
