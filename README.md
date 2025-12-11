# OpenContext

**Simple API for AI-powered company context analysis using Google Gemini**

OpenContext is a lightweight Next.js API that extracts comprehensive company information from any website URL using Google's Gemini AI. Perfect for lead research, competitive analysis, and business intelligence.

## ✨ Features

- **🤖 AI-Powered Analysis** - Uses Google Gemini 1.5 Pro to extract comprehensive company context
- **⚡ Simple API** - Single endpoint: URL input → structured JSON output
- **🔒 Secure** - Server-side API key configuration
- **📊 Structured Output** - Consistent JSON schema for easy integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/federicodeponte/opencontext.git
   cd opencontext
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your Gemini API key to `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the API server**
   ```bash
   npm run dev
   ```

   The API will be available at [http://localhost:3000](http://localhost:3000)

## 📖 API Usage

### Endpoint

**POST** `/api/analyze`

### Request

```json
{
  "url": "https://example.com",
  "apiKey": "your-gemini-api-key"  // Optional if GEMINI_API_KEY env var is set
}
```

### Response

```json
{
  "company_name": "Example Company",
  "company_url": "https://example.com",
  "industry": "Technology",
  "description": "A comprehensive description of the company...",
  "products": ["Product 1", "Product 2"],
  "target_audience": "Tech startups and enterprises",
  "competitors": ["Competitor A", "Competitor B"],
  "tone": "Professional and technical",
  "pain_points": ["Problem 1", "Problem 2"],
  "value_propositions": ["Value 1", "Value 2"],
  "use_cases": ["Use case 1", "Use case 2"],
  "content_themes": ["Theme 1", "Theme 2"]
}
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://anthropic.com"
  }'
```

### JavaScript Example

```javascript
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com'
  }),
});

const analysis = await response.json();
console.log(analysis);
```

## 🛠️ Technical Details

### What Gets Extracted

The AI analyzes the website and extracts:
- Company name and website
- Industry and description  
- Products/services offered
- Target audience
- Main competitors
- Brand tone and voice
- Customer pain points
- Value propositions
- Use cases and applications
- Content themes and topics

### Project Structure

```
opencontext/
├── src/
│   ├── app/
│   │   ├── api/analyze/route.ts    # Main analysis API
│   │   ├── layout.tsx              # Minimal layout
│   │   └── page.tsx                # API documentation page
│   └── lib/
│       └── types.ts                # TypeScript definitions
├── .env.example                    # Environment template
└── README.md
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add `GEMINI_API_KEY` environment variable
   - Deploy

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |

## 🔧 Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Invalid request (missing URL)
- `401` - Invalid API key
- `503` - Service unavailable (missing API key configuration)
- `500` - Internal server error

Example error response:
```json
{
  "error": "Website analysis is temporarily unavailable. Please configure your Gemini API key."
}
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/federicodeponte/opencontext/issues)

---

**Made with ❤️ by [Federico de Ponte](https://github.com/federicodeponte)**