# OpenContext

**AI-powered company context analysis CLI using Google Gemini**

OpenContext extracts comprehensive company information from any website URL using Google's Gemini AI. Perfect for lead research, competitive analysis, and business intelligence.

## Features

- AI-Powered Analysis using Google Gemini 2.0 Flash
- Simple CLI interface
- Structured JSON output
- Standalone - just needs your Gemini API key

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
opencontext configure
```

Get a Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey)

## Usage

```bash
# Analyze a company website
opencontext analyze https://example.com

# Save output to file
opencontext analyze https://example.com -o company.json

# Show help
opencontext --help
```

## What Gets Extracted

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

## Example Output

```json
{
  "company_name": "Example Company",
  "company_url": "https://example.com",
  "industry": "Technology",
  "description": "A comprehensive description...",
  "products": ["Product 1", "Product 2"],
  "target_audience": "Tech startups and enterprises",
  "competitors": ["Competitor A", "Competitor B"],
  "tone": "Professional and technical",
  "pain_points": ["Problem 1", "Problem 2"],
  "value_propositions": ["Value 1", "Value 2"]
}
```

## License

MIT License - see [LICENSE](LICENSE) for details.
