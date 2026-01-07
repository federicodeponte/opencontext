"""
Shared constants for OpenContext.
"""

import os

# Gemini model with URL Context + Google Search + JSON output support
# Can be overridden via GEMINI_MODEL environment variable
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
