"""
Shared components for OpenContext.

- GeminiClient: Unified Gemini client with URL Context + Google Search
- Constants: Shared configuration
- PromptLoader: Load prompts from text files
"""

from .gemini_client import GeminiClient
from .constants import GEMINI_MODEL
from .prompt_loader import load_prompt, prompt_exists

__all__ = [
    "GeminiClient",
    "GEMINI_MODEL",
    "load_prompt",
    "prompt_exists",
]
