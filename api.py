"""
OpenContext - FastAPI Application

RESTful API wrapper for company context extraction.

Usage:
    uvicorn api:app --reload --port 8000

API Docs:
    - Swagger UI: http://localhost:8000/docs
    - ReDoc: http://localhost:8000/redoc
    - OpenAPI JSON: http://localhost:8000/openapi.json
"""

import asyncio
import os
import threading
import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, HttpUrl

from opencontext import get_company_context, CompanyContext


# =============================================================================
# Pydantic Models for API
# =============================================================================

class JobStatus(str, Enum):
    """Job status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalyzeRequest(BaseModel):
    """Request model for analyzing a company."""
    url: HttpUrl = Field(
        ...,
        description="Company website URL to analyze",
        json_schema_extra={"example": "https://example.com"}
    )
    fallback_on_error: bool = Field(
        default=True,
        description="Return basic detection if AI fails"
    )


class JobResponse(BaseModel):
    """Response model for job creation."""
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    message: str = Field(..., description="Status message")
    created_at: str = Field(..., description="Job creation timestamp")


class JobStatusResponse(BaseModel):
    """Response model for job status check."""
    job_id: str
    status: JobStatus
    url: str
    result: Optional[Dict] = Field(None, description="Analysis result (when completed)")
    ai_called: Optional[bool] = Field(None, description="Whether AI was called")
    error: Optional[str] = Field(None, description="Error message (when failed)")
    created_at: str
    updated_at: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "3.0.0"
    timestamp: str


class ContextResponse(BaseModel):
    """Response model for synchronous analysis."""
    company_name: str
    company_url: str
    industry: str
    description: str
    products: List[str]
    target_audience: str
    competitors: List[str]
    tone: str
    pain_points: List[str]
    value_propositions: List[str]
    use_cases: List[str]
    content_themes: List[str]
    voice_persona: Dict
    visual_identity: Dict
    authors: List[Dict]
    ai_called: bool


# =============================================================================
# In-Memory Job Store (replace with Redis/DB in production)
# =============================================================================

class JobStore:
    """Thread-safe in-memory job store."""

    def __init__(self):
        self._jobs: Dict[str, dict] = {}
        self._lock = threading.Lock()

    def create(self, job_id: str, url: str) -> dict:
        job = {
            "job_id": job_id,
            "status": JobStatus.PENDING,
            "url": url,
            "result": None,
            "ai_called": None,
            "error": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        with self._lock:
            self._jobs[job_id] = job
        return job

    def get(self, job_id: str) -> Optional[dict]:
        with self._lock:
            return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs) -> Optional[dict]:
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(kwargs)
                self._jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()
                return self._jobs[job_id]
        return None

    def list_all(self, limit: int = 50) -> List[dict]:
        with self._lock:
            jobs = sorted(
                self._jobs.values(),
                key=lambda x: x["created_at"],
                reverse=True
            )
            return jobs[:limit]

    def delete(self, job_id: str) -> bool:
        with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                return True
        return False


# Global job store
job_store = JobStore()


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="OpenContext API",
    description="""
## AI-Powered Company Context Extraction

OpenContext extracts comprehensive company information from any website using Google's Gemini AI.

### What Gets Extracted

- **Company Basics**: Name, industry, products, description
- **Target Audience**: ICP and customer profile
- **Competitors**: Main competitors in the industry
- **Content Strategy**: Pain points, value propositions, use cases, themes
- **Voice Persona**: Writing style guide for content creation
- **Visual Identity**: Brand colors, design elements, image style prompts
- **Blog Authors**: Real authors from existing blog articles

### Use Cases

- Lead research and qualification
- Competitive analysis
- Content creation and personalization
- Brand voice consistency
- AI image generation prompts
    """,
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "OpenContext",
        "url": "https://github.com/federicodeponte/opencontext",
    },
    license_info={
        "name": "MIT",
    },
)


# =============================================================================
# Background Task Runner
# =============================================================================

async def run_analysis_job(job_id: str, url: str, fallback_on_error: bool):
    """Background task to run the analysis."""
    try:
        job_store.update(job_id, status=JobStatus.RUNNING)

        context, ai_called = await get_company_context(
            url=url,
            fallback_on_error=fallback_on_error
        )

        job_store.update(
            job_id,
            status=JobStatus.COMPLETED,
            result=context.model_dump(),
            ai_called=ai_called,
        )

    except Exception as e:
        job_store.update(
            job_id,
            status=JobStatus.FAILED,
            error=str(e)
        )


# =============================================================================
# API Endpoints
# =============================================================================

@app.get(
    "/",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check",
)
async def health_check():
    """Check API health status."""
    return HealthResponse(
        status="healthy",
        version="3.0.0",
        timestamp=datetime.utcnow().isoformat(),
    )


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check (alias)",
)
async def health():
    """Health check endpoint (alias for root)."""
    return await health_check()


@app.post(
    "/api/v1/analyze",
    response_model=ContextResponse,
    tags=["Analysis"],
    summary="Analyze company (synchronous)",
)
async def analyze_sync(request: AnalyzeRequest):
    """
    Analyze a company website synchronously (blocking).

    **Warning:** This endpoint blocks until analysis is complete (typically 30-60 seconds).
    For non-blocking analysis, use the async job endpoint.

    **Example request:**
    ```json
    {
        "url": "https://example.com",
        "fallback_on_error": true
    }
    ```
    """
    try:
        context, ai_called = await get_company_context(
            url=str(request.url),
            fallback_on_error=request.fallback_on_error
        )

        result = context.model_dump()
        result["ai_called"] = ai_called
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/v1/jobs",
    response_model=JobResponse,
    status_code=202,
    tags=["Jobs"],
    summary="Start analysis job (async)",
)
async def create_job(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start a new company analysis job asynchronously.

    The job runs in the background. Use the returned `job_id`
    to check status via `GET /api/v1/jobs/{job_id}`.

    **Example request:**
    ```json
    {
        "url": "https://example.com",
        "fallback_on_error": true
    }
    ```
    """
    job_id = str(uuid.uuid4())
    url = str(request.url)
    job = job_store.create(job_id, url)

    # Start background task
    background_tasks.add_task(
        run_analysis_job,
        job_id,
        url,
        request.fallback_on_error
    )

    return JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        message=f"Analysis job started for {url}",
        created_at=job["created_at"],
    )


@app.get(
    "/api/v1/jobs",
    response_model=List[JobStatusResponse],
    tags=["Jobs"],
    summary="List all jobs",
)
async def list_jobs(
    limit: int = Query(default=50, ge=1, le=100, description="Max jobs to return"),
):
    """List all analysis jobs, sorted by creation time (newest first)."""
    jobs = job_store.list_all(limit=limit)
    return [
        JobStatusResponse(
            job_id=job["job_id"],
            status=job["status"],
            url=job["url"],
            result=None,  # Don't include full result in list view
            ai_called=job.get("ai_called"),
            error=job.get("error"),
            created_at=job["created_at"],
            updated_at=job["updated_at"],
        )
        for job in jobs
    ]


@app.get(
    "/api/v1/jobs/{job_id}",
    response_model=JobStatusResponse,
    tags=["Jobs"],
    summary="Get job status",
)
async def get_job(job_id: str):
    """
    Get the status and result of an analysis job.

    Returns full result when job is completed.
    """
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return JobStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        url=job["url"],
        result=job.get("result"),
        ai_called=job.get("ai_called"),
        error=job.get("error"),
        created_at=job["created_at"],
        updated_at=job["updated_at"],
    )


@app.delete(
    "/api/v1/jobs/{job_id}",
    status_code=204,
    tags=["Jobs"],
    summary="Delete a job",
)
async def delete_job(job_id: str):
    """Delete a job and its results."""
    if not job_store.delete(job_id):
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return None


# =============================================================================
# Run with: uvicorn api:app --reload
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
