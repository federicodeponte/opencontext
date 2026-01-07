"""
OpenContext - AI-Powered Company Context Analysis

Extract comprehensive company context from any website using Gemini AI.
"""

from .models import (
    CompanyContext,
    VoicePersona,
    LanguageStyle,
    VisualIdentity,
    BlogImageExample,
    AuthorInfo,
    generate_slug,
)
from .opencontext import (
    run_opencontext,
    get_company_context,
    basic_company_detection,
)

__all__ = [
    # Models
    "CompanyContext",
    "VoicePersona",
    "LanguageStyle",
    "VisualIdentity",
    "BlogImageExample",
    "AuthorInfo",
    "generate_slug",
    # Functions
    "run_opencontext",
    "get_company_context",
    "basic_company_detection",
]
