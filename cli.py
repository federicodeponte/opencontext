#!/usr/bin/env python3
"""
OpenContext CLI - AI-Powered Company Context Analysis

Analyze company websites to extract comprehensive context using Gemini AI:
- Company basics (name, industry, products, services)
- Target audience and competitors
- Brand voice and tone
- Pain points and value propositions
- Writing persona for content creation

Usage:
    opencontext analyze https://example.com
    opencontext analyze https://example.com -o company-context.json
"""

import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

console = Console()

# Output directory
DOWNLOADS_DIR = Path.home() / "Downloads"
CONFIG_DIR = Path.home() / ".opencontext"
CONFIG_FILE = CONFIG_DIR / "config.json"


def get_config() -> dict:
    """Load configuration."""
    if not CONFIG_FILE.exists():
        return {}
    try:
        return json.loads(CONFIG_FILE.read_text())
    except Exception:
        return {}


def save_config(config: dict) -> None:
    """Save configuration."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


# Analysis prompt (matches route.ts)
ANALYSIS_PROMPT = '''You are an expert business analyst and content strategist. Analyze the company website at {url} and extract comprehensive company context INCLUDING a detailed writing persona.

IMPORTANT INSTRUCTIONS:
1. Use the URL Context tool to fetch and analyze the actual content at {url}
2. Use Google Search to find additional real information about this company
3. Do NOT make up or hallucinate data - only use information you actually retrieve
4. If you cannot find information about the company, return an error field in the JSON

Analyze all retrieved information to provide:

1. Company basics (name, website, industry)
2. Products/services offered
3. Target audience and ideal customers
4. Brand voice and tone
5. Key value propositions
6. Customer pain points they address
7. Common use cases
8. Content themes they focus on
9. Main competitors (based on industry and offerings)
10. **CRITICAL: A detailed voice_persona for content writing**

The voice_persona is the most important part - it defines HOW to write content that RESONATES WITH THE TARGET AUDIENCE (ICP).

**CRITICAL: The voice must match what the ICP responds to, not just the company's brand voice.**

Consider the ICP (Ideal Customer Profile):
- Who are they? (role, seniority, technical level)
- What do they value? (speed, accuracy, innovation, ROI, simplicity)
- How do they consume content? (skim vs deep-read, mobile vs desktop)
- What tone resonates with them? (peer-to-peer, expert-to-learner, consultant-to-executive)
- What makes them trust content? (data, case studies, peer validation, credentials)

Examples of ICP-aligned voice:
- **ICP: CTOs/DevOps** → Direct, technical, code examples, benchmark data, "here's how it actually works"
- **ICP: Marketing Directors** → ROI-focused, competitive insights, "here's how to beat competitors"
- **ICP: Small Business Owners** → Practical, cost-conscious, "here's what you can do today"
- **ICP: Enterprise Procurement** → Risk mitigation, compliance, vendor comparison, "here's why this is safe"

The voice_persona must help writers AVOID robotic AI patterns like:
- Starting every section with "What is X?"
- Using "According to experts..." constantly
- Filler phrases like "In today's rapidly evolving landscape..."
- Over-hedging with "may", "might", "potentially"

Return ONLY valid JSON in exactly this format:
{{
  "company_name": "Official company name",
  "company_url": "Normalized company website URL",
  "industry": "Primary industry category",
  "description": "Clear 2-3 sentence company description",
  "products": ["Product 1", "Product 2"],
  "target_audience": "Ideal customer profile description",
  "competitors": ["Competitor 1", "Competitor 2"],
  "tone": "Brand voice description (e.g., professional, friendly, authoritative)",
  "pain_points": ["Pain point 1", "Pain point 2"],
  "value_propositions": ["Value prop 1", "Value prop 2"],
  "use_cases": ["Use case 1", "Use case 2"],
  "content_themes": ["Theme 1", "Theme 2"],
  "voice_persona": {{
    "icp_profile": "Brief description of the ICP this voice is tailored for.",
    "voice_style": "2-3 sentence description of the writing voice that resonates with this ICP.",
    "language_style": {{
      "formality": "Level of formality (casual/professional/formal)",
      "complexity": "Vocabulary complexity (simple/moderate/technical/expert)",
      "sentence_length": "Preferred sentence structure (short and punchy / mixed / detailed)",
      "perspective": "How to address reader (peer-to-peer / expert-to-learner / consultant-to-executive)"
    }},
    "sentence_patterns": [
      "Pattern 1",
      "Pattern 2"
    ],
    "vocabulary_level": "Description of technical vocabulary expectations",
    "authority_signals": [
      "What makes this ICP trust content"
    ],
    "do_list": [
      "Specific behaviors that resonate with this ICP"
    ],
    "dont_list": [
      "Anti-patterns that turn off this ICP"
    ],
    "example_phrases": [
      "Phrases that capture the right tone"
    ],
    "opening_styles": [
      "Section openers that engage this ICP"
    ]
  }}
}}

Analyze: {url}'''


async def analyze_with_gemini(url: str, api_key: str) -> dict:
    """Analyze a company URL using Gemini with grounding."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise Exception(
            "google-genai not installed.\n\n"
            "   Run: pip install google-genai"
        )

    client = genai.Client(api_key=api_key)

    prompt = ANALYSIS_PROMPT.format(url=url)

    # Use Gemini with grounding tools
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.0-flash-exp",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=8192,
            response_mime_type="application/json",
            tools=[
                types.Tool(google_search=types.GoogleSearch()),
            ]
        )
    )

    # Parse response
    text = response.text.strip()

    # Extract JSON from markdown if present
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    # Find JSON object
    if not text.startswith("{"):
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            text = match.group(0)
        else:
            raise Exception(f"Could not parse response: {text[:500]}")

    return json.loads(text)


@click.group()
@click.version_option(version="2.0.0")
def cli():
    """
    OpenContext - AI-Powered Company Context Analysis

    Extract comprehensive company context from any website using Gemini AI.
    """
    pass


@cli.command()
@click.argument("url")
@click.option("--output", "-o", default=None, help="Output file (json)")
@click.option("--verbose", "-v", is_flag=True, help="Show detailed results")
def analyze(url: str, output: Optional[str], verbose: bool):
    """
    Analyze a company website and extract context.

    Uses Gemini AI with Google Search grounding to extract:
    - Company info (name, industry, products, services)
    - Target audience and competitors
    - Brand voice and writing persona

    Example:
        opencontext analyze https://example.com
        opencontext analyze https://example.com -v
    """
    # Normalize URL
    if not url.startswith("http"):
        url = f"https://{url}"

    # Check API key
    config = get_config()
    api_key = os.getenv("GEMINI_API_KEY") or config.get("gemini_key")

    if not api_key:
        console.print()
        console.print(Panel(
            "[bold red]No API key configured![/bold red]\n\n"
            "OpenContext needs a Gemini API key to analyze websites.\n\n"
            "[bold]Quick setup:[/bold]\n\n"
            "  [cyan]opencontext config[/cyan]\n\n"
            "[bold]Or set environment variable:[/bold]\n\n"
            "  [cyan]export GEMINI_API_KEY='your-key'[/cyan]",
            border_style="red"
        ))
        console.print()
        sys.exit(1)

    console.print()
    console.print(Panel(
        f"[bold cyan]OpenContext - Company Analysis[/bold cyan]\n\n"
        f"URL: [green]{url}[/green]",
        border_style="cyan"
    ))
    console.print()

    async def run_analysis():
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("[cyan]Analyzing company website...", total=None)

            try:
                result = await analyze_with_gemini(url, api_key)
                progress.update(task, description="[green]Analysis complete!")
                return result
            except Exception as e:
                progress.update(task, description="[red]Analysis failed")
                raise e

    try:
        result = asyncio.run(run_analysis())
    except Exception as e:
        console.print(f"\n[red]Error:[/red] {e}")
        sys.exit(1)

    # Display results
    console.print()
    console.print(Panel(
        f"[bold]Company:[/bold] {result.get('company_name', 'Unknown')}\n"
        f"[bold]Industry:[/bold] {result.get('industry', 'Unknown')}\n"
        f"[bold]Products:[/bold] {len(result.get('products', []))} found\n"
        f"[bold]Competitors:[/bold] {len(result.get('competitors', []))} found\n"
        f"[bold]Pain Points:[/bold] {len(result.get('pain_points', []))} found",
        title="[bold green]Analysis Results[/bold green]",
        border_style="green"
    ))

    if verbose:
        console.print()
        console.print(f"[bold]Description:[/bold] {result.get('description', 'N/A')}")
        console.print()
        console.print(f"[bold]Target Audience:[/bold] {result.get('target_audience', 'N/A')}")
        console.print()
        console.print(f"[bold]Tone:[/bold] {result.get('tone', 'N/A')}")

        if result.get("products"):
            console.print()
            console.print("[bold]Products:[/bold]")
            for p in result["products"][:5]:
                console.print(f"  - {p}")

        if result.get("competitors"):
            console.print()
            console.print("[bold]Competitors:[/bold]")
            for c in result["competitors"][:5]:
                console.print(f"  - {c}")

        if result.get("pain_points"):
            console.print()
            console.print("[bold]Pain Points:[/bold]")
            for p in result["pain_points"][:5]:
                console.print(f"  - {p}")

        if result.get("voice_persona"):
            vp = result["voice_persona"]
            console.print()
            console.print(Panel(
                f"[bold]ICP Profile:[/bold] {vp.get('icp_profile', 'N/A')}\n\n"
                f"[bold]Voice Style:[/bold] {vp.get('voice_style', 'N/A')}",
                title="[bold cyan]Writing Persona[/bold cyan]",
                border_style="cyan"
            ))

    # Save output
    output_path = output
    if not output_path:
        safe_url = url.replace("https://", "").replace("http://", "").replace("/", "-")[:30]
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        output_path = DOWNLOADS_DIR / f"context-{safe_url}-{timestamp}.json"

    Path(output_path).write_text(json.dumps(result, indent=2))
    console.print(f"\n[dim]Saved to:[/dim] [cyan]{output_path}[/cyan]")
    console.print()


@cli.command()
def config():
    """Configure your Gemini API key."""
    console.print()
    console.print(Panel(
        "[bold]Configuration[/bold]\n\n"
        "OpenContext uses Google's Gemini AI to analyze websites.\n"
        "You need a free API key to get started.",
        border_style="cyan"
    ))
    console.print()

    current_config = get_config()

    if current_config.get("gemini_key"):
        key = current_config["gemini_key"]
        masked = f"{key[:8]}...{key[-4:]}"
        console.print(f"[green]Current API key:[/green] {masked}")
        console.print()

        if not click.confirm("Update API key?", default=False):
            console.print("\n[dim]Configuration unchanged.[/dim]\n")
            return

    console.print()
    console.print("[bold]Get Your Free API Key:[/bold]")
    console.print("1. Visit: [cyan]https://aistudio.google.com/apikey[/cyan]")
    console.print("2. Click 'Create API Key'")
    console.print("3. Copy the key and paste below")
    console.print()

    api_key = click.prompt("Enter your Gemini API key")

    if not api_key or len(api_key) < 10:
        console.print("\n[red]Invalid API key.[/red]\n")
        sys.exit(1)

    current_config["gemini_key"] = api_key.strip()
    save_config(current_config)

    console.print()
    console.print(Panel(
        "[bold green]Configuration saved![/bold green]\n\n"
        f"Config file: [dim]{CONFIG_FILE}[/dim]\n\n"
        "You're ready to analyze company websites!\n\n"
        "[cyan]Try:[/cyan] opencontext analyze https://example.com",
        border_style="green"
    ))
    console.print()


@cli.command()
def check():
    """Check API key configuration."""
    console.print()
    console.print("[bold cyan]OpenContext - Configuration Check[/bold cyan]")
    console.print()

    gemini_key = os.getenv("GEMINI_API_KEY") or get_config().get("gemini_key")

    table = Table(show_header=False)
    table.add_column("Setting", style="dim")
    table.add_column("Status")

    if gemini_key:
        table.add_row("GEMINI_API_KEY", f"[green]Set[/green] ({gemini_key[:8]}...)")
    else:
        table.add_row("GEMINI_API_KEY", "[red]Not set[/red]")

    console.print(table)
    console.print()

    if not gemini_key:
        console.print("[bold]Setup:[/bold]")
        console.print("  opencontext config")
        console.print("  # or")
        console.print("  export GEMINI_API_KEY='your-key'")
    else:
        console.print("[green]Ready to analyze![/green]")

    console.print()


def main():
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
