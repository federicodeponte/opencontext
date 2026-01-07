# OpenContext

**AI-powered company context analysis using Google Gemini**

OpenContext extracts comprehensive company information from any website URL using Google's Gemini AI. Perfect for lead research, competitive analysis, content creation, and business intelligence.

## Features

- **AI-Powered Analysis** using Google Gemini with Google Search grounding
- **Visual Identity Extraction** for consistent image generation (brand colors, style, mood)
- **Blog Authors** extraction from existing articles
- **Writing Persona (voice_persona)** tailored to ICP for content creation
- **CLI & REST API** - Use from terminal or integrate via HTTP
- **Structured JSON** output matching openblog schema
- **Modular Architecture** with shared GeminiClient

## What's New in v3.0

- **REST API**: FastAPI server with async job support
- **Visual Identity**: Brand colors, design elements, typography, image style prompts
- **Blog Image Examples**: Analyzes existing blog images for style reference
- **Authors Extraction**: Finds real blog authors with profiles
- **Shared GeminiClient**: Unified client with retry logic, URL Context, Google Search
- **Prompt Files**: Prompts stored in text files for easy iteration
- **Full Parity** with openblog/stage 1 schema

## Installation

```bash
git clone https://github.com/federicodeponte/opencontext.git
cd opencontext
pip install -e .
```

## Configuration

Set your Gemini API key:

```bash
# Option 1: Environment variable
export GEMINI_API_KEY=your_key_here

# Option 2: Use configure command
opencontext config
```

Get a Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey)

## Usage

```bash
# Analyze a company website
opencontext analyze https://example.com

# Verbose output (shows all details)
opencontext analyze https://example.com -v

# Save output to specific file
opencontext analyze https://example.com -o company.json

# Check configuration
opencontext check

# Show help
opencontext --help
```

## REST API

Start the API server:

```bash
# Install API dependencies
pip install -e ".[api]"

# Start server
uvicorn api:app --reload --port 8000

# API docs at http://localhost:8000/docs
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/api/v1/analyze` | Analyze company (sync, blocking) |
| POST | `/api/v1/jobs` | Start analysis job (async) |
| GET | `/api/v1/jobs` | List all jobs |
| GET | `/api/v1/jobs/{id}` | Get job status/result |
| DELETE | `/api/v1/jobs/{id}` | Delete job |

### Example API Usage

```bash
# Synchronous analysis (blocking)
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Async job (non-blocking)
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Check job status
curl http://localhost:8000/api/v1/jobs/{job_id}
```

## Project Structure

```
opencontext/
├── cli.py                      # CLI entry point
├── api.py                      # FastAPI REST API
├── opencontext/                # Main package
│   ├── __init__.py
│   ├── models.py               # Pydantic models (CompanyContext, VoicePersona, etc.)
│   ├── opencontext.py          # Core analysis logic
│   └── prompts/
│       └── opencontext.txt     # Analysis prompt (170 lines)
├── shared/                     # Shared components
│   ├── __init__.py
│   ├── constants.py            # GEMINI_MODEL config
│   ├── gemini_client.py        # Unified Gemini client
│   └── prompt_loader.py        # Load prompts from files
├── pyproject.toml
├── requirements.txt
├── CLAUDE.md
└── README.md
```

## What Gets Extracted

### Company Basics
- Company name, website, industry
- Products/services offered
- Target audience (ICP)
- Main competitors
- Brand tone and voice

### Content Strategy
- Customer pain points
- Value propositions
- Use cases
- Content themes

### Writing Persona (voice_persona)
- ICP profile description
- Voice style for content
- Language style (formality, complexity, perspective)
- Sentence patterns
- Do's and don'ts
- Example phrases
- Opening styles

### Visual Identity (for Image Generation)
- Brand colors (hex codes)
- Secondary colors
- Visual style (minimalist, bold, corporate, etc.)
- Design elements (gradients, icons, illustrations)
- Typography style
- Mood
- Image style prompt (for AI image generation)
- Blog image examples with descriptions
- Elements to avoid

### Blog Authors
- Full name
- Job title/role
- Bio
- Profile image URL
- LinkedIn/Twitter URLs

## Example Output

```json
{
  "company_name": "Example Corp",
  "company_url": "https://example.com",
  "industry": "Technology",
  "description": "A leading provider of...",
  "products": ["Product A", "Product B"],
  "target_audience": "Tech-savvy SMBs looking for...",
  "competitors": ["Competitor 1", "Competitor 2"],
  "tone": "professional",
  "voice_persona": {
    "icp_profile": "CTOs and engineering leaders at mid-sized companies",
    "voice_style": "Direct and technical, focusing on practical implementation",
    "language_style": {
      "formality": "professional",
      "complexity": "technical",
      "sentence_length": "mixed",
      "perspective": "peer-to-peer"
    },
    "do_list": ["Use code examples", "Show benchmark data"],
    "dont_list": ["Avoid marketing fluff", "Skip obvious statements"]
  },
  "visual_identity": {
    "brand_colors": ["#1E40AF", "#3B82F6"],
    "visual_style": "Modern minimalist with tech focus",
    "mood": "Professional, innovative, trustworthy",
    "image_style_prompt": "Modern minimalist illustration with blue gradient...",
    "blog_image_examples": [
      {
        "url": "https://example.com/blog/hero.jpg",
        "description": "Abstract blue gradient with geometric shapes",
        "image_type": "hero"
      }
    ]
  },
  "authors": [
    {
      "name": "John Smith",
      "title": "CTO",
      "bio": "Leading engineering at Example Corp",
      "linkedin_url": "https://linkedin.com/in/johnsmith"
    }
  ]
}
```

## Using as a Library

```python
import asyncio
from opencontext import get_company_context, CompanyContext

async def main():
    # Get context with fallback
    context, ai_called = await get_company_context("https://example.com")

    print(f"Company: {context.company_name}")
    print(f"Industry: {context.industry}")
    print(f"Colors: {context.visual_identity.brand_colors}")
    print(f"Authors: {[a.name for a in context.authors]}")

    # Export to dict
    data = context.model_dump()

asyncio.run(main())
```

## Integration with OpenBlog

This schema is fully compatible with [openblog](https://github.com/federicodeponte/openblog) Stage 1:

```python
# In openblog, use OpenContext output directly
from opencontext import get_company_context

context, _ = await get_company_context(company_url)
# Pass to Stage 2 for blog generation with consistent visual identity
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Model to use (default: `gemini-2.0-flash`) |

## License

MIT License - see [LICENSE](LICENSE) for details.
