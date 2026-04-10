"""
Floom wrapper for OpenContext.

Exposes company context analysis as a Floom action.
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

# Ensure project root is on path for imports
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def analyze(url: str, additional_context: str = "", _knowledge: dict = None) -> dict:
    """Analyze a company website and extract comprehensive context."""
    print(f"Analyzing company: {url}")

    # Merge knowledge docs into additional_context if provided
    if _knowledge:
        knowledge_text = "\n".join(
            f"[{name}]: {text[:500]}" for name, text in _knowledge.items()
        )
        additional_context = (additional_context + "\n\n" + knowledge_text).strip() if additional_context else knowledge_text
        logger.info("analyze() merged %d knowledge docs into context", len(_knowledge))

    # Build user_context from additional_context if provided
    user_context = None
    if additional_context and additional_context.strip():
        user_context = {"system_instructions": additional_context.strip()}

    try:
        from opencontext import get_company_context
        context, ai_called = asyncio.run(
            get_company_context(url=url, user_context=user_context)
        )
        data = context.model_dump()
    except Exception as e:
        logger.warning(f"Package import failed ({e}), using direct Gemini call")
        data = _direct_analyze(url, additional_context)
        ai_called = True

    company_name = data.get("company_name", "Unknown")
    print(f"Analysis complete: {company_name}")

    # Build markdown summary
    summary = _build_summary(data, ai_called)

    return {
        "company_name": company_name,
        "summary": summary,
        "context_json": data,
    }


def _direct_analyze(url: str, additional_context: str = "") -> dict:
    """Fallback: call Gemini directly without the opencontext package chain."""
    from shared.gemini_client import GeminiClient

    if not url.startswith("http"):
        url = f"https://{url}"

    client = GeminiClient()
    prompt = f"""Analyze the company website at {url} and extract comprehensive company context.

Return JSON with these fields:
- company_name: Official company name
- company_url: Company website URL
- industry: Primary industry category
- description: 2-3 sentence company description
- products: List of products/services
- target_audience: Ideal customer profile
- competitors: List of main competitors
- tone: Brand voice tone
- pain_points: Customer pain points addressed
- value_propositions: Key value propositions
- use_cases: Common use cases
- content_themes: Content themes/topics

Analyze: {url}"""

    if additional_context:
        prompt += f"\n\nAdditional context from user:\n{additional_context}"

    result = asyncio.run(client.generate(
        prompt=prompt,
        use_url_context=True,
        use_google_search=True,
        json_output=True,
        temperature=0.3,
    ))
    return result


def _build_summary(data: dict, ai_called: bool) -> str:
    """Build a markdown summary from context data."""
    lines = []
    name = data.get("company_name", "Unknown")
    lines.append(f"# {name}")
    lines.append("")

    if data.get("description"):
        lines.append(data["description"])
        lines.append("")

    if data.get("industry"):
        lines.append(f"**Industry:** {data['industry']}")
    if data.get("company_url"):
        lines.append(f"**URL:** {data['company_url']}")
    if data.get("tone"):
        lines.append(f"**Brand Tone:** {data['tone']}")
    lines.append("")

    if data.get("products"):
        lines.append("## Products & Services")
        for p in data["products"]:
            lines.append(f"- {p}")
        lines.append("")

    if data.get("target_audience"):
        lines.append(f"## Target Audience")
        lines.append(data["target_audience"])
        lines.append("")

    if data.get("competitors"):
        lines.append("## Competitors")
        for c in data["competitors"]:
            lines.append(f"- {c}")
        lines.append("")

    if data.get("pain_points"):
        lines.append("## Pain Points")
        for pp in data["pain_points"]:
            lines.append(f"- {pp}")
        lines.append("")

    if data.get("value_propositions"):
        lines.append("## Value Propositions")
        for vp in data["value_propositions"]:
            lines.append(f"- {vp}")
        lines.append("")

    if data.get("use_cases"):
        lines.append("## Use Cases")
        for uc in data["use_cases"]:
            lines.append(f"- {uc}")
        lines.append("")

    source = "AI-powered analysis (Gemini)" if ai_called else "Basic URL detection"
    lines.append(f"---\n*Source: {source}*")

    return "\n".join(lines)
