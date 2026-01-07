"""
OpenContext - Company Context Extraction via Gemini

Extracts comprehensive company context from a URL using Google Gemini AI
with Google Search grounding.

Uses shared GeminiClient for consistency.
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional, Tuple

# Add parent to path for shared imports
_parent = Path(__file__).parent.parent
if str(_parent) not in sys.path:
    sys.path.insert(0, str(_parent))

from .models import CompanyContext

try:
    from shared.gemini_client import GeminiClient
except ImportError:
    GeminiClient = None  # Fallback mode

try:
    from shared.prompt_loader import load_prompt
    _PROMPT_LOADER_AVAILABLE = True
except ImportError:
    _PROMPT_LOADER_AVAILABLE = False

logger = logging.getLogger(__name__)


# =============================================================================
# OpenContext Prompt - loaded from prompts/opencontext.txt
# =============================================================================

def _get_opencontext_prompt(url: str) -> str:
    """Load OpenContext prompt from file or use fallback."""
    if _PROMPT_LOADER_AVAILABLE:
        try:
            return load_prompt("opencontext", "opencontext", url=url)
        except FileNotFoundError:
            logger.warning("Prompt file not found, using fallback")

    # Fallback prompt (minimal version)
    return f'''Analyze the company website at {url} and extract company context.
Return JSON with: company_name, company_url, industry, description, products,
target_audience, competitors, tone, voice_persona, visual_identity, authors.
Analyze: {url}'''


# =============================================================================
# Gemini Client
# =============================================================================

async def run_opencontext(url: str, api_key: Optional[str] = None) -> CompanyContext:
    """
    Run OpenContext analysis on a company URL.

    Uses shared GeminiClient with Google Search grounding.

    Args:
        url: Company website URL
        api_key: Gemini API key (falls back to GEMINI_API_KEY env var)

    Returns:
        CompanyContext with extracted company information

    Raises:
        ValueError: If no API key provided
        Exception: If Gemini call fails
    """
    # Normalize URL
    if not url.startswith("http"):
        url = f"https://{url}"

    logger.info(f"Running OpenContext for {url}")

    try:
        # Use shared GeminiClient
        if GeminiClient is None:
            raise ImportError("shared.gemini_client not available")

        client = GeminiClient(api_key=api_key)

        # Build prompt (loaded from prompts/opencontext.txt)
        prompt = _get_opencontext_prompt(url)

        # Call with Google Search grounding (URL Context not supported by gemini-2.0-flash)
        result = await client.generate(
            prompt=prompt,
            use_url_context=False,
            use_google_search=True,
            json_output=True,
            temperature=0.3,
        )

        logger.info(f"OpenContext complete: {result.get('company_name', 'Unknown')}")

        # Convert to CompanyContext
        return CompanyContext.from_dict(result)

    except Exception as e:
        logger.error(f"OpenContext failed for {url}: {e}")
        raise


# =============================================================================
# Fallback: Basic Detection (no AI)
# =============================================================================

def basic_company_detection(url: str) -> CompanyContext:
    """
    Basic company detection from URL when no API key available.

    Extracts company name from domain. No AI call.

    Args:
        url: Company website URL

    Returns:
        CompanyContext with basic info from URL
    """
    from urllib.parse import urlparse

    # Normalize URL
    if not url.startswith("http"):
        url = f"https://{url}"

    # Extract domain
    domain = urlparse(url).netloc.replace("www.", "")
    company_name = domain.split(".")[0].replace("-", " ").title()

    logger.warning(f"Using basic detection for {url} (no API key)")

    return CompanyContext(
        company_name=company_name,
        company_url=url,
        industry="",
        description="",
        products=[],
        target_audience="",
        competitors=[],
        tone="professional",
        pain_points=[],
        value_propositions=[],
        use_cases=[],
        content_themes=[],
    )


# =============================================================================
# Main Entry Point
# =============================================================================

async def get_company_context(
    url: str,
    api_key: Optional[str] = None,
    fallback_on_error: bool = True
) -> Tuple[CompanyContext, bool]:
    """
    Get company context, with optional fallback to basic detection.

    Args:
        url: Company website URL
        api_key: Gemini API key (optional, uses env var)
        fallback_on_error: If True, returns basic detection on error

    Returns:
        Tuple of (CompanyContext, ai_called: bool)
    """
    # Check if API key available
    api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key:
        if fallback_on_error:
            logger.warning("No API key, using basic detection")
            return basic_company_detection(url), False
        else:
            raise ValueError("No Gemini API key available")

    try:
        context = await run_opencontext(url, api_key)
        return context, True
    except Exception as e:
        if fallback_on_error:
            logger.warning(f"OpenContext failed, using basic detection: {e}")
            return basic_company_detection(url), False
        else:
            raise


# =============================================================================
# CLI for standalone testing
# =============================================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python opencontext.py <company_url>")
        sys.exit(1)

    url = sys.argv[1]

    async def main():
        context, ai_called = await get_company_context(url)
        print(json.dumps(context.model_dump(), indent=2))
        print(f"\nAI called: {ai_called}")

    asyncio.run(main())
