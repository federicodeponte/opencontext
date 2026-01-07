#!/usr/bin/env python3
"""
OpenContext CLI - AI-Powered Company Context Analysis

Analyze company websites to extract comprehensive context using Gemini AI:
- Company basics (name, industry, products, services)
- Target audience and competitors
- Brand voice and tone
- Pain points and value propositions
- Writing persona for content creation
- Visual identity for image generation
- Blog authors

Usage:
    opencontext analyze https://example.com
    opencontext analyze https://example.com -o company-context.json
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from opencontext import get_company_context, CompanyContext

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


@click.group()
@click.version_option(version="3.0.0")
def cli():
    """
    OpenContext - AI-Powered Company Context Analysis

    Extract comprehensive company context from any website using Gemini AI.

    Now includes:
    - Visual identity for image generation
    - Blog authors extraction
    - Writing persona (voice_persona)
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
    - Visual identity for image generation
    - Blog authors

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
        f"[bold cyan]OpenContext v3.0 - Company Analysis[/bold cyan]\n\n"
        f"URL: [green]{url}[/green]\n\n"
        f"[dim]Now extracts: visual identity, authors, voice persona[/dim]",
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
                # Set API key in environment for the client
                os.environ["GEMINI_API_KEY"] = api_key
                result, ai_called = await get_company_context(url, api_key)
                progress.update(task, description="[green]Analysis complete!")
                return result, ai_called
            except Exception as e:
                progress.update(task, description="[red]Analysis failed")
                raise e

    try:
        result, ai_called = asyncio.run(run_analysis())
    except Exception as e:
        console.print(f"\n[red]Error:[/red] {e}")
        sys.exit(1)

    # Convert to dict for output
    result_dict = result.model_dump()

    # Display results
    console.print()
    console.print(Panel(
        f"[bold]Company:[/bold] {result.company_name or 'Unknown'}\n"
        f"[bold]Industry:[/bold] {result.industry or 'Unknown'}\n"
        f"[bold]Products:[/bold] {len(result.products)} found\n"
        f"[bold]Competitors:[/bold] {len(result.competitors)} found\n"
        f"[bold]Pain Points:[/bold] {len(result.pain_points)} found\n"
        f"[bold]Authors:[/bold] {len(result.authors)} found\n"
        f"[bold]Visual Identity:[/bold] {'Yes' if result.visual_identity.brand_colors else 'No'}",
        title="[bold green]Analysis Results[/bold green]",
        border_style="green"
    ))

    if verbose:
        console.print()
        console.print(f"[bold]Description:[/bold] {result.description or 'N/A'}")
        console.print()
        console.print(f"[bold]Target Audience:[/bold] {result.target_audience or 'N/A'}")
        console.print()
        console.print(f"[bold]Tone:[/bold] {result.tone or 'N/A'}")

        if result.products:
            console.print()
            console.print("[bold]Products:[/bold]")
            for p in result.products[:5]:
                console.print(f"  - {p}")

        if result.competitors:
            console.print()
            console.print("[bold]Competitors:[/bold]")
            for c in result.competitors[:5]:
                console.print(f"  - {c}")

        if result.pain_points:
            console.print()
            console.print("[bold]Pain Points:[/bold]")
            for p in result.pain_points[:5]:
                console.print(f"  - {p}")

        if result.voice_persona and result.voice_persona.icp_profile:
            vp = result.voice_persona
            console.print()
            console.print(Panel(
                f"[bold]ICP Profile:[/bold] {vp.icp_profile or 'N/A'}\n\n"
                f"[bold]Voice Style:[/bold] {vp.voice_style or 'N/A'}",
                title="[bold cyan]Writing Persona[/bold cyan]",
                border_style="cyan"
            ))

        if result.visual_identity and result.visual_identity.brand_colors:
            vi = result.visual_identity
            console.print()
            console.print(Panel(
                f"[bold]Brand Colors:[/bold] {', '.join(vi.brand_colors[:4]) if vi.brand_colors else 'N/A'}\n"
                f"[bold]Visual Style:[/bold] {vi.visual_style or 'N/A'}\n"
                f"[bold]Mood:[/bold] {vi.mood or 'N/A'}\n"
                f"[bold]Blog Images:[/bold] {len(vi.blog_image_examples)} examples found",
                title="[bold magenta]Visual Identity[/bold magenta]",
                border_style="magenta"
            ))

        if result.authors:
            console.print()
            console.print("[bold]Blog Authors:[/bold]")
            for author in result.authors[:3]:
                console.print(f"  - {author.name}" + (f" ({author.title})" if author.title else ""))

    # Save output
    output_path = output
    if not output_path:
        safe_url = url.replace("https://", "").replace("http://", "").replace("/", "-")[:30]
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        output_path = DOWNLOADS_DIR / f"context-{safe_url}-{timestamp}.json"

    Path(output_path).write_text(json.dumps(result_dict, indent=2))
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
    console.print("[bold cyan]OpenContext v3.0 - Configuration Check[/bold cyan]")
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
