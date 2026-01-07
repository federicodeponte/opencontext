# OpenContext

AI-powered company context extraction using Gemini with Google Search grounding.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenContext                               │
├─────────────────────────────────────────────────────────────────┤
│  CLI (cli.py)              │  API (api.py)                      │
│  - opencontext analyze     │  - POST /api/v1/analyze (sync)     │
│  - opencontext config      │  - POST /api/v1/jobs (async)       │
│  - opencontext check       │  - GET /api/v1/jobs/{id}           │
├─────────────────────────────────────────────────────────────────┤
│                     opencontext/                                 │
│  - models.py       Pydantic models (CompanyContext, etc.)       │
│  - opencontext.py  Core analysis logic                          │
│  - prompts/        Prompt text files                            │
├─────────────────────────────────────────────────────────────────┤
│                       shared/                                    │
│  - gemini_client.py   Unified Gemini client                     │
│  - prompt_loader.py   Load prompts from files                   │
│  - constants.py       GEMINI_MODEL config                       │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
opencontext/
├── cli.py                      # CLI entry point
├── api.py                      # FastAPI REST API
├── opencontext/                # Main package
│   ├── __init__.py
│   ├── models.py               # Pydantic models
│   ├── opencontext.py          # Core analysis logic
│   └── prompts/
│       └── opencontext.txt     # Analysis prompt
├── shared/                     # Shared components
│   ├── __init__.py
│   ├── constants.py            # GEMINI_MODEL
│   ├── gemini_client.py        # Unified Gemini client
│   └── prompt_loader.py        # Prompt file loader
├── pyproject.toml              # Package config
├── requirements.txt            # Dependencies
└── README.md
```

## Data Models

### CompanyContext (main output)
- `company_name`, `company_url`, `industry`, `description`
- `products`, `target_audience`, `competitors`, `tone`
- `pain_points`, `value_propositions`, `use_cases`, `content_themes`
- `voice_persona` (VoicePersona)
- `visual_identity` (VisualIdentity)
- `authors` (List[AuthorInfo])

### VoicePersona (writing guide)
- `icp_profile`, `voice_style`
- `language_style` (formality, complexity, sentence_length, perspective)
- `do_list`, `dont_list`, `example_phrases`, `opening_styles`

### VisualIdentity (image generation)
- `brand_colors`, `secondary_colors`
- `visual_style`, `design_elements`, `typography_style`, `mood`
- `image_style_prompt` (for AI image generation)
- `blog_image_examples` (List[BlogImageExample])
- `avoid_in_images`

### AuthorInfo
- `name`, `title`, `bio`
- `image_url`, `linkedin_url`, `twitter_url`

## Key Design Decisions

1. **Shared GeminiClient**: Unified client with URL Context + Google Search grounding
2. **Prompt Files**: Prompts in text files for easy iteration without code changes
3. **Pydantic Models**: Type-safe schemas with validation
4. **Dual Interface**: CLI for local use, FastAPI for integration
5. **Fallback Mode**: Basic detection from URL if no API key or AI fails
6. **Full Parity**: Schema matches openblog/stage 1 for seamless integration

## Environment Variables

```
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash  # optional override
```

## Usage

### CLI
```bash
# Analyze company
opencontext analyze https://example.com

# Verbose output
opencontext analyze https://example.com -v

# Configure API key
opencontext config
```

### API
```bash
# Start server
uvicorn api:app --reload --port 8000

# Synchronous analysis
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Async job
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Check job status
curl http://localhost:8000/api/v1/jobs/{job_id}
```

### As Library
```python
from opencontext import get_company_context

context, ai_called = await get_company_context("https://example.com")
print(context.company_name)
print(context.visual_identity.brand_colors)
```

## Integration with OpenBlog

This package provides Stage 1 context for the openblog pipeline:

```python
# In openblog Stage 1
from opencontext import get_company_context, CompanyContext

context, _ = await get_company_context(company_url)
# context.visual_identity.image_style_prompt → Stage 2 image generation
# context.authors → Article author assignment
# context.voice_persona → Content writing guide
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Health check (alias) |
| POST | `/api/v1/analyze` | Analyze company (sync, blocking) |
| POST | `/api/v1/jobs` | Start analysis job (async) |
| GET | `/api/v1/jobs` | List all jobs |
| GET | `/api/v1/jobs/{id}` | Get job status/result |
| DELETE | `/api/v1/jobs/{id}` | Delete job |

## Dependencies

- `google-genai>=1.0` - Gemini API client
- `pydantic>=2.0` - Data validation
- `python-dotenv>=1.0` - Environment variables
- `click>=8.0` - CLI framework
- `rich>=13.0` - Beautiful terminal output
- `fastapi>=0.109` - REST API framework
- `uvicorn>=0.27` - ASGI server
