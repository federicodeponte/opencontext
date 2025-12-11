# 🌐 OpenContext

> Open-source AI-powered company context analysis

Extract structured business information from any website using Google Gemini 3.0 Pro with web search and URL context integration. Built with Next.js, TypeScript, and Tailwind CSS.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Gemini API](https://img.shields.io/badge/Gemini-3.0%20Pro-orange)](https://ai.google.dev/gemini-api)

## ✨ Features

- 🤖 **AI-Powered Analysis** - Powered by Google Gemini 3.0 Pro Preview
- 🌐 **Web Search Integration** - Combines URL content with Google search results
- 📊 **Structured Data Extraction** - Returns clean, structured business information
- 🏢 **Multi-Company Profiles** - Save and switch between multiple company contexts
- ⚡ **Real-Time Progress** - Live progress tracking with time estimation
- 💾 **Local Storage** - Automatic persistence with localStorage
- 🎨 **Beautiful UI** - Clean, responsive design with dark mode
- 🔧 **Type-Safe** - Full TypeScript support throughout

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/federicodeponte/opencontext.git
cd opencontext
npm install
```

### 2. Environment Setup

Create a `.env.local` file:

```bash
# Required: Get your API key from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start analyzing websites!

## 📖 Usage

### Basic Component Usage

```tsx
import { ContextForm, useContextStorage } from '@/components'

export function MyApp() {
  const { businessContext, analyzeWebsite } = useContextStorage()
  
  return (
    <div>
      <ContextForm onAnalysisComplete={(context) => {
        console.log('Analysis complete:', context)
      }} />
    </div>
  )
}
```

### API Usage

```tsx
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' })
})

const companyData = await response.json()
```

## 🔧 API Reference

### Analyze Endpoint

**POST** `/api/analyze`

#### Request Body

```typescript
{
  url: string        // Website URL to analyze
  apiKey?: string    // Optional: Gemini API key (uses env var if not provided)
}
```

#### Response

```typescript
{
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
}
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ContextForm.tsx      # Main analysis form
│   ├── CompanySelector.tsx  # Multi-company selector  
│   └── ui/                  # Reusable UI components
├── hooks/
│   └── useContextStorage.ts # Context management hook
├── lib/
│   ├── types.ts            # TypeScript interfaces
│   ├── utils.ts            # Utility functions
│   └── constants.ts        # App constants
└── app/
    ├── api/analyze/        # Analysis API endpoint
    └── page.tsx           # Demo page
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checks
```

### Key Dependencies

- **@google/generative-ai** - Gemini API integration
- **lucide-react** - Beautiful icons
- **sonner** - Toast notifications
- **@radix-ui/** - Accessible UI primitives
- **tailwind-merge** - Utility merging

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect to Vercel
3. Set `GEMINI_API_KEY` environment variable
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/federicodeponte/opencontext)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Google Gemini** - For providing powerful AI capabilities
- **Next.js Team** - For the amazing React framework
- **Tailwind CSS** - For the utility-first CSS framework
- **Radix UI** - For accessible component primitives

---

**Built with ❤️ for the open-source community**

[⭐ Star us on GitHub](https://github.com/federicodeponte/opencontext) if you find this useful!
