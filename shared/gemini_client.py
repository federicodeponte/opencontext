"""
Shared Gemini Client for OpenContext.

Unified client using Gemini with:
- URL Context (fetch and analyze web pages)
- Google Search (grounded search results)
- Structured JSON output
- Automatic retry with exponential backoff
"""

import asyncio
import json
import logging
import os
import re
import random
from typing import Dict, Any, Optional, Union, List
from pathlib import Path

from dotenv import load_dotenv

from .constants import GEMINI_MODEL

# Default retry configuration
DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 1.0  # seconds
DEFAULT_MAX_DELAY = 30.0  # seconds

# Load .env from project root
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path, override=True)

logger = logging.getLogger(__name__)


class GeminiClient:
    """
    Shared Gemini client with URL Context + Google Search + JSON output.

    Usage:
        client = GeminiClient()

        # With grounding (URL Context + Google Search)
        result = await client.generate(
            prompt="Analyze https://example.com and tell me about the company",
            use_url_context=True,
            use_google_search=True,
            json_output=True,
        )

        # Without grounding (faster, for surgical operations)
        result = await client.generate(
            prompt="Fix this JSON...",
            use_url_context=False,
            use_google_search=False,
            json_output=True,
        )
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        max_retries: int = DEFAULT_MAX_RETRIES,
        base_delay: float = DEFAULT_BASE_DELAY,
        max_delay: float = DEFAULT_MAX_DELAY,
    ):
        """
        Initialize Gemini client.

        Args:
            api_key: Gemini API key. Falls back to GEMINI_API_KEY env var.
            max_retries: Maximum number of retries for transient failures (default: 3)
            base_delay: Base delay in seconds for exponential backoff (default: 1.0)
            max_delay: Maximum delay between retries in seconds (default: 30.0)
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "No Gemini API key provided. Set GEMINI_API_KEY environment variable "
                "or pass api_key parameter."
            )

        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

        self._client = None
        self._types = None
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy initialization of google-genai client."""
        if self._initialized:
            return

        try:
            from google import genai
            from google.genai import types
            self._genai = genai
            self._types = types
            self._client = genai.Client(api_key=self.api_key)
            self._initialized = True
            logger.debug(f"GeminiClient initialized with model: {GEMINI_MODEL}")
        except ImportError:
            raise ImportError("google-genai not installed. Run: pip install google-genai")

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        use_url_context: bool = False,
        use_google_search: bool = True,
        json_output: bool = True,
        temperature: float = 0.3,
        max_tokens: int = 8192,
        timeout: int = 120,
    ) -> Union[Dict[str, Any], str]:
        """
        Generate content using Gemini.

        Args:
            prompt: The prompt to send to Gemini
            system_instruction: Optional system instruction (persistent context, role definition)
            use_url_context: Enable URL Context tool for fetching web pages
            use_google_search: Enable Google Search tool for grounding
            json_output: Request structured JSON output
            temperature: Generation temperature (0-1)
            max_tokens: Maximum output tokens
            timeout: Request timeout in seconds

        Returns:
            Dict if json_output=True, otherwise raw string.
        """
        self._ensure_initialized()

        # Build tools list
        tools = []
        if use_url_context:
            tools.append(self._types.Tool(url_context=self._types.UrlContext()))
        if use_google_search:
            tools.append(self._types.Tool(google_search=self._types.GoogleSearch()))

        # Build config
        config = self._types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_tokens,
            tools=tools if tools else None,
            response_mime_type="application/json" if json_output else None,
        )

        logger.debug(f"Generating with model={GEMINI_MODEL}, tools={len(tools)}, json={json_output}")

        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                # Run in thread pool for async
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._client.models.generate_content,
                        model=GEMINI_MODEL,
                        contents=prompt,
                        config=config,
                    ),
                    timeout=timeout,
                )

                text = response.text.strip()

                if json_output:
                    return self._parse_json(text)
                else:
                    return text

            except asyncio.TimeoutError:
                last_error = asyncio.TimeoutError(f"Request timed out after {timeout}s")
                logger.warning(f"Gemini request timed out (attempt {attempt + 1}/{self.max_retries + 1})")
            except Exception as e:
                last_error = e
                # Check if error is retryable (rate limit, server errors, transient network issues)
                error_str = str(e).lower()
                is_retryable = any(x in error_str for x in [
                    'rate limit', '429', '500', '502', '503', '504',
                    'overloaded', 'quota', 'temporarily unavailable',
                    'connection', 'timeout', 'resource exhausted'
                ])

                if not is_retryable or attempt >= self.max_retries:
                    logger.error(f"Gemini generation failed: {e}")
                    raise

                logger.warning(f"Gemini request failed (attempt {attempt + 1}/{self.max_retries + 1}): {e}")

            # Exponential backoff with jitter
            if attempt < self.max_retries:
                delay = min(self.base_delay * (2 ** attempt), self.max_delay)
                jitter = random.uniform(0, delay * 0.1)
                await asyncio.sleep(delay + jitter)
                logger.info(f"Retrying in {delay + jitter:.1f}s...")

        # All retries exhausted
        logger.error(f"Gemini request failed after {self.max_retries + 1} attempts")
        raise last_error

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """
        Parse JSON from Gemini response, handling markdown code blocks.

        Args:
            text: Raw response text

        Returns:
            Parsed JSON dictionary

        Raises:
            ValueError: If JSON cannot be parsed
        """
        # Extract JSON from markdown if present
        if "```json" in text:
            parts = text.split("```json")
            if len(parts) > 1:
                inner_parts = parts[1].split("```")
                text = inner_parts[0].strip()
        elif "```" in text:
            parts = text.split("```")
            if len(parts) > 1:
                text = parts[1].split("```")[0].strip()

        # Find JSON object start
        if not text.startswith("{"):
            match = re.search(r'\{', text)
            if match:
                text = text[match.start():]
            else:
                raise ValueError(f"Could not find JSON in response: {text[:200]}")

        # Try parsing directly first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try repair before balanced extraction
            try:
                repaired = self._repair_json(text)
                return json.loads(repaired)
            except json.JSONDecodeError:
                pass

        # Fallback: Extract balanced JSON object
        brace_count = 0
        end_idx = 0
        in_string = False
        escape_next = False

        for i, char in enumerate(text):
            if escape_next:
                escape_next = False
                continue
            if char == '\\' and in_string:
                escape_next = True
                continue
            if char == '"' and not escape_next:
                in_string = not in_string
                continue
            if in_string:
                continue

            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break

        if end_idx > 0:
            text = text[:end_idx]

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            # Try to repair common JSON issues from Gemini
            logger.warning(f"JSON parse failed, attempting repair: {e}")
            repaired = self._repair_json(text)
            return json.loads(repaired)
    
    def _repair_json(self, text: str) -> str:
        """
        Attempt to repair common JSON issues from Gemini responses.
        """
        # Fix unquoted property names (JavaScript-style): { foo: "bar" } -> { "foo": "bar" }
        # Match: start of object or comma, optional whitespace, unquoted word, colon
        text = re.sub(r'([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', text)
        
        # Remove trailing commas before ] or }
        text = re.sub(r',\s*([}\]])', r'\1', text)
        
        # Add missing commas between array elements or object properties
        # Pattern: }" -> },"  or ]" -> ],"  (but not at end)
        text = re.sub(r'([}\]"])\s*\n\s*"', r'\1,\n"', text)
        text = re.sub(r'([}\]])\s*\n\s*\{', r'\1,\n{', text)
        text = re.sub(r'([}\]])\s*\n\s*\[', r'\1,\n[', text)
        
        # Fix missing commas between string values
        text = re.sub(r'"\s*\n\s*"', '",\n"', text)
        
        return text

    async def generate_with_schema(
        self,
        prompt: str,
        response_schema: Any,
        system_instruction: Optional[str] = None,
        use_url_context: bool = False,
        use_google_search: bool = True,
        temperature: float = 0.3,
        max_tokens: int = 8192,
        timeout: int = 180,
        extract_sources: bool = False,
    ) -> Dict[str, Any]:
        """
        Generate content with structured output using response_schema.

        This method uses Gemini's native structured output feature with a JSON schema,
        which guarantees the response matches the expected structure.

        Args:
            prompt: The prompt to send to Gemini
            response_schema: JSON schema or Pydantic model for response structure
            system_instruction: Optional system instruction
            use_url_context: Enable URL Context tool for fetching web pages
            use_google_search: Enable Google Search tool for grounding
            temperature: Generation temperature (0-1)
            max_tokens: Maximum output tokens
            timeout: Request timeout in seconds
            extract_sources: Extract URLs from grounding metadata

        Returns:
            Dict matching the provided schema
        """
        self._ensure_initialized()

        # Build tools list
        tools = []
        if use_url_context:
            tools.append(self._types.Tool(url_context=self._types.UrlContext()))
        if use_google_search:
            tools.append(self._types.Tool(google_search=self._types.GoogleSearch()))

        # Build config with response_schema for structured output
        config = self._types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_tokens,
            tools=tools if tools else None,
            response_mime_type="application/json",
            response_schema=response_schema,
        )

        logger.debug(f"Generating with schema: model={GEMINI_MODEL}, tools={len(tools)}")

        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._client.models.generate_content,
                        model=GEMINI_MODEL,
                        contents=prompt,
                        config=config,
                    ),
                    timeout=timeout,
                )

                text = response.text.strip()
                result = self._parse_json(text)

                # Extract grounding sources if requested
                if extract_sources and use_google_search:
                    grounding_sources = self._extract_grounding_sources(response)
                    if grounding_sources:
                        result["_grounding_sources"] = grounding_sources

                return result

            except asyncio.TimeoutError:
                last_error = asyncio.TimeoutError(f"Request timed out after {timeout}s")
                logger.warning(f"Gemini request timed out (attempt {attempt + 1}/{self.max_retries + 1})")
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                is_retryable = any(x in error_str for x in [
                    'rate limit', '429', '500', '502', '503', '504',
                    'overloaded', 'quota', 'temporarily unavailable',
                    'connection', 'timeout', 'resource exhausted'
                ])

                if not is_retryable or attempt >= self.max_retries:
                    logger.error(f"Gemini generation with schema failed: {e}")
                    raise

                logger.warning(f"Gemini request failed (attempt {attempt + 1}/{self.max_retries + 1}): {e}")

            if attempt < self.max_retries:
                delay = min(self.base_delay * (2 ** attempt), self.max_delay)
                jitter = random.uniform(0, delay * 0.1)
                await asyncio.sleep(delay + jitter)

        raise last_error

    def _extract_grounding_sources(self, response: Any) -> List[Dict[str, str]]:
        """Extract grounding sources from Gemini response metadata."""
        sources = []
        try:
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                    metadata = candidate.grounding_metadata
                    if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                        for chunk in metadata.grounding_chunks:
                            if hasattr(chunk, 'web') and chunk.web:
                                sources.append({
                                    'uri': getattr(chunk.web, 'uri', ''),
                                    'title': getattr(chunk.web, 'title', '')
                                })
        except Exception as e:
            logger.warning(f"Failed to extract grounding sources: {e}")
        return sources

    def __repr__(self) -> str:
        return f"GeminiClient(model={GEMINI_MODEL}, initialized={self._initialized})"
