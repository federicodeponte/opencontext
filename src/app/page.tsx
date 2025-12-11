import { ContextForm } from '@/components/ContextForm'
import { CompanySelector } from '@/components/CompanySelector'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              OpenContext
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Open-source AI-powered company context analysis. Extract structured business information from any website using Gemini 3.0 Pro.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Context Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6">
                <ContextForm showSystemInstructions />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Selector */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold mb-4">Current Context</h3>
                <CompanySelector />
              </div>
            </div>

            {/* Features */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold mb-4">Features</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    AI-powered analysis with Gemini 3.0 Pro
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Web search & URL context integration
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Multi-company profile management
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Structured data extraction
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Real-time progress tracking
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Local storage persistence
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Getting Started</h3>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Set your GEMINI_API_KEY environment variable</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Enter any company website URL</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Click &quot;Analyze&quot; and wait 30-60 seconds</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium">4.</span>
                    <span>Review extracted company context</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Built with Next.js, Tailwind CSS, and Radix UI. 
            Powered by Google Gemini 3.0 Pro with web search.
          </p>
          <p>
            <a 
              href="https://github.com/federicodeponte/opencontext" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on GitHub
            </a>
            {" • "}
            <a 
              href="https://ai.google.dev/gemini-api/docs/models/gemini-v2"
              target="_blank"
              rel="noopener noreferrer" 
              className="text-primary hover:underline"
            >
              Gemini API
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
