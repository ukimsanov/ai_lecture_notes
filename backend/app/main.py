"""
NoteLens - AI Lecture Notes Generator
Phase 3: Multi-agent processing with PostgreSQL persistence

FastAPI application following October 2025 best practices:
- Proper CORS configuration
- Async endpoint design
- Structured error handling
- PostgreSQL database persistence
- LangGraph checkpointing
"""
import os
import time
from contextlib import asynccontextmanager
from typing import Dict, Annotated

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ExtractRequest,
    ExtractResponse,
    HealthResponse,
    ProcessRequest,
    ProcessResponse,
    ProcessedResult,
    MultiAgentResult,
    MultiAgentResponse,
    AITool,
    VideoMetadata
)
from app.tools import YouTubeTranscriptExtractor, LectureSummarizer
from app.agents import MultiAgentOrchestrator
from app.database import get_db, dispose_engine
from app.database.connection import get_database_url

# Load environment variables
load_dotenv()


# ============================================================================
# Lifespan context manager for startup/shutdown events
# ============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Following FastAPI 0.115+ and LangGraph 1.0.0 best practices (Oct 2025).

    Sets up:
    - PostgreSQL connection pool for LangGraph checkpointing
    - AsyncPostgresSaver for agent state persistence
    - Database engine cleanup on shutdown
    """
    # Startup
    print("🚀 NoteLens API starting up...")
    print(f"📍 Environment: {os.getenv('ENV', 'development')}")

    # Get database URL and convert for psycopg (remove +asyncpg)
    db_url = get_database_url()
    psycopg_url = db_url.replace("+asyncpg", "")  # psycopg doesn't use +asyncpg

    print(f"📊 Connecting to database...")

    # Create PostgreSQL connection pool for LangGraph checkpointing
    async with AsyncConnectionPool(
        conninfo=psycopg_url,
        max_size=10,
        kwargs={
            "autocommit": True,  # Required for checkpointer.setup()
            "prepare_threshold": 0,
            "row_factory": dict_row
        }
    ) as pool:
        # Initialize LangGraph checkpointer
        checkpointer = AsyncPostgresSaver(pool)

        # Create checkpoint tables (only runs once, idempotent)
        await checkpointer.setup()
        print("✅ LangGraph checkpointer initialized")

        # Store checkpointer in app state for use in endpoints
        app.state.checkpointer = checkpointer

        yield

    # Shutdown
    print("👋 NoteLens API shutting down...")
    print("🗄️  Disposing database engine...")
    await dispose_engine()
    print("✅ Cleanup complete")


# ============================================================================
# FastAPI Application
# ============================================================================
app = FastAPI(
    title="NoteLens API",
    description="AI-powered YouTube lecture notes generator with multi-agent orchestration",
    version="0.1.0",
    lifespan=lifespan
)


# ============================================================================
# CORS Configuration (2025 Best Practices)
# ============================================================================
# Get allowed origins from environment variable (comma-separated)
allowed_origins_str = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"  # Default for local dev
)
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Specific origins, not "*"
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicit methods
    allow_headers=["*"],  # Can be more restrictive in production
)


# ============================================================================
# Global Exception Handler
# ============================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """
    Catch-all exception handler to prevent server crashes
    and provide consistent error responses.
    """
    print(f"❌ Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error occurred",
            "detail": str(exc) if os.getenv("DEBUG") == "true" else None
        }
    )


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/", response_model=HealthResponse)
async def root() -> HealthResponse:
    """
    Root endpoint - health check and API info.
    """
    return HealthResponse(
        status="healthy",
        message="NoteLens API is running. Visit /docs for API documentation."
    )


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint for monitoring and deployment verification.
    """
    return HealthResponse(
        status="healthy",
        message="All systems operational"
    )


@app.post("/api/extract", response_model=ExtractResponse, status_code=status.HTTP_200_OK)
async def extract_transcript(request: ExtractRequest) -> ExtractResponse:
    """
    Extract transcript and metadata from a YouTube video.

    This is the Phase 0 minimal endpoint - just transcript extraction.
    Later phases will add multi-agent processing for summarization and tool extraction.

    Args:
        request: ExtractRequest containing video_url

    Returns:
        ExtractResponse with transcript data or error

    Raises:
        HTTPException: If extraction fails
    """
    try:
        # Initialize extractor
        extractor = YouTubeTranscriptExtractor()

        # Extract transcript (blocking I/O - will optimize in later phases)
        transcript_data = extractor.extract(request.video_url)

        return ExtractResponse(
            success=True,
            data=transcript_data,
            error=None
        )

    except ValueError as e:
        # Client error - invalid URL or no transcript
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    except Exception as e:
        # Server error - unexpected failure
        print(f"❌ Extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract transcript: {str(e)}"
        )


@app.post("/api/process", response_model=MultiAgentResponse, status_code=status.HTTP_200_OK)
async def process_video(
    request: ProcessRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> MultiAgentResponse:
    """
    Process a YouTube video with multi-agent orchestration and save to database.

    Phase 3: Multi-agent LangGraph orchestration with PostgreSQL persistence
    - Agent 1: Fetch transcript (YouTubeTranscriptExtractor)
    - Agent 2: Generate lecture notes (Gemini 2.5 Flash)
    - Agent 3: Extract AI tools (GPT-4o-mini)
    - Saves video metadata and processing results to PostgreSQL
    - Uses LangGraph checkpointing for state persistence

    Agents 2 and 3 run in parallel for optimal performance.

    Args:
        request: ProcessRequest containing video_url
        db: Database session (dependency injection)

    Returns:
        MultiAgentResponse with lecture notes, AI tools, and metadata

    Raises:
        HTTPException: If processing fails
    """
    from app.database.models import Video, ProcessingResult
    from sqlalchemy import select
    from datetime import datetime, timezone

    start_time = time.time()

    try:
        print(f"📹 Processing video with multi-agent orchestration: {request.video_url}")

        # Initialize multi-agent orchestrator
        orchestrator = MultiAgentOrchestrator()

        # Process through LangGraph (handles all agents automatically)
        final_state = orchestrator.process(request.video_url)

        # Calculate processing time
        processing_time = time.time() - start_time

        # Convert state dict to Pydantic models
        video_metadata = VideoMetadata(**final_state["video_metadata"])
        ai_tools = [AITool(**tool) for tool in final_state["ai_tools"]]

        print(f"✅ Multi-agent processing complete in {processing_time:.2f}s")
        print(f"   - Lecture notes: {len(final_state['lecture_notes'])} chars")
        print(f"   - AI tools extracted: {len(ai_tools)}")

        # ====================================================================
        # Save to database (Phase 3)
        # ====================================================================

        # Check if video already exists in database
        result_query = await db.execute(
            select(Video).where(Video.video_id == video_metadata.video_id)
        )
        video_record = result_query.scalar_one_or_none()

        if video_record:
            # Update existing video
            video_record.times_processed += 1
            video_record.last_processed_at = datetime.now(timezone.utc)
            print(f"📊 Updated existing video (processed {video_record.times_processed} times)")
        else:
            # Create new video record
            video_record = Video(
                video_id=video_metadata.video_id,
                video_url=video_metadata.video_url,
                title=video_metadata.video_title,
                channel_name=video_metadata.channel_name,
                duration=video_metadata.duration,
                times_processed=1,
                last_processed_at=datetime.now(timezone.utc)
            )
            db.add(video_record)
            await db.flush()  # Get the UUID
            print(f"💾 Created new video record")

        # Create processing result record
        processing_record = ProcessingResult(
            video_id=video_record.id,  # UUID foreign key
            transcript_text=final_state["transcript"],
            transcript_length=len(final_state["transcript"]),
            lecture_notes=final_state["lecture_notes"],
            ai_tools=[tool.model_dump() for tool in ai_tools],  # JSON
            ai_tools_count=len(ai_tools),
            processing_time_seconds=round(processing_time, 2),
            agent_execution_order=final_state["agent_execution_order"]
        )
        db.add(processing_record)

        # Commit transaction (handled by get_db dependency)
        print(f"💾 Saved processing results to database")

        # ====================================================================
        # Build API response
        # ====================================================================

        result = MultiAgentResult(
            video_metadata=video_metadata,
            lecture_notes=final_state["lecture_notes"],
            ai_tools=ai_tools,
            processing_time=round(processing_time, 2),
            agent_execution_order=final_state["agent_execution_order"]
        )

        return MultiAgentResponse(
            success=True,
            data=result,
            error=None
        )

    except ValueError as e:
        # Client error - invalid URL or no transcript
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    except Exception as e:
        # Server error - unexpected failure
        print(f"❌ Processing error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process video: {str(e)}"
        )


# ============================================================================
# Development Runner
# ============================================================================
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,  # Auto-reload on code changes (dev only)
        log_level="info"
    )
