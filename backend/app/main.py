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
import json
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Annotated, AsyncGenerator, Optional
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, status, Depends, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette import EventSourceResponse
from dotenv import load_dotenv
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_

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
from app.tools import YouTubeTranscriptExtractor, LectureSummarizer, AIToolExtractor
from app.agents import MultiAgentOrchestrator
from app.database import get_db, dispose_engine
from app.database.connection import get_database_url
from app.database.models import Video, ProcessingResult

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
# Include API Routers (Modular Architecture - Oct 2025 Best Practice)
# ============================================================================
from app.api import history_router, presets_router

app.include_router(history_router)
app.include_router(presets_router)


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
# Cache Helper Function (Smart Caching - Phase 5.5)
# ============================================================================

async def get_cached_result(
    video_url: str,
    cache_days: int = 7,
    db: AsyncSession = None
) -> Optional[tuple[ProcessingResult, Video]]:
    """
    Check for cached processing result within specified days.

    Args:
        video_url: YouTube video URL
        cache_days: Number of days to consider cache valid (default: 7)
        db: Database session (optional, creates new if not provided)

    Returns:
        Tuple of (ProcessingResult, Video) if cached result exists, None otherwise

    Following SQLAlchemy 2.0 async best practices (Oct 2025)
    """
    if db is None:
        # This shouldn't happen in normal flow, but handle it gracefully
        return None

    try:
        # Extract video ID from URL
        extractor = YouTubeTranscriptExtractor()
        video_id = extractor._extract_video_id(video_url)

        # Calculate cache cutoff time (timezone-aware for PostgreSQL)
        cache_cutoff = datetime.now(timezone.utc) - timedelta(days=cache_days)

        # Query for recent processing result
        query = (
            select(ProcessingResult, Video)
            .join(Video, ProcessingResult.video_id == Video.id)
            .where(
                and_(
                    Video.video_id == video_id,
                    ProcessingResult.created_at > cache_cutoff
                )
            )
            .order_by(desc(ProcessingResult.created_at))
            .limit(1)
        )

        result = await db.execute(query)
        row = result.first()

        if row:
            processing_result, video = row
            print(f"💾 Cache HIT: Found result from {processing_result.created_at}")
            return (processing_result, video)
        else:
            print(f"❌ Cache MISS: No recent result found")
            return None

    except Exception as e:
        print(f"⚠️  Cache check error: {e}")
        return None


@app.get("/api/process/stream")
async def process_video_stream(
    request: Request,
    video_url: str,
    force: bool = Query(False, description="Force reprocessing even if cached result exists"),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream video processing with ChatGPT-style real-time updates.

    Phase 5.5: Server-Sent Events (SSE) streaming endpoint with smart caching
    - Checks for cached results (within 7 days)
    - If cached and force=False: streams from database (fast)
    - If not cached or force=True: processes fresh (uses API credits)
    - Streams thinking process status updates
    - Streams lecture notes chunks as they're generated
    - Returns AI tools when extraction completes

    Yields SSE events:
    - {type: "cache", data: {from_cache: true, cached_at: "..."}} (if cached)
    - {type: "status", data: "Fetching transcript..."}
    - {type: "metadata", data: {...}}
    - {type: "chunk", data: "text chunk..."}
    - {type: "notes_complete"}
    - {type: "tools", data: [{tool1}, {tool2}]}
    - {type: "complete"}

    Args:
        request: FastAPI Request for disconnect detection
        video_url: YouTube video URL (query parameter)
        force: Force reprocessing even if cached (default: False)
        db: Database session (injected)

    Returns:
        EventSourceResponse with SSE stream
    """
    async def event_generator() -> AsyncGenerator[dict, None]:
        """Generate SSE events for video processing"""
        try:
            print(f"\n🎬 Starting stream processing for: {video_url}")
            print(f"🔧 Force reprocess: {force}")

            # ================================================================
            # Step 0: Check Cache (Smart Caching)
            # ================================================================
            cached_result = None
            if not force:
                print("💾 Checking cache...")
                yield {
                    "event": "message",
                    "data": json.dumps({"type": "status", "data": "Checking cache..."})
                }

                cached_result = await get_cached_result(video_url, cache_days=7, db=db)

            if cached_result and not force:
                # ================================================================
                # CACHED PATH: Stream from database
                # ================================================================
                processing_result, video = cached_result
                cache_age = datetime.now(timezone.utc) - processing_result.created_at
                cache_hours = cache_age.total_seconds() / 3600

                print(f"✅ Using cached result (age: {cache_hours:.1f} hours)")

                # Send cache indicator
                yield {
                    "event": "message",
                    "data": json.dumps({
                        "type": "cache",
                        "data": {
                            "from_cache": True,
                            "cached_at": processing_result.created_at.isoformat(),
                            "cache_age_hours": round(cache_hours, 1)
                        }
                    })
                }

                # Send metadata
                yield {
                    "event": "message",
                    "data": json.dumps({
                        "type": "metadata",
                        "data": {
                            "video_id": video.video_id,
                            "video_title": video.title,
                            "video_url": video.video_url,
                            "channel_name": video.channel_name,
                            "duration": video.duration,
                            "transcript": processing_result.transcript_text
                        }
                    })
                }

                # Stream lecture notes (simulated chunking for consistency)
                notes = processing_result.lecture_notes
                chunk_size = 50  # Characters per chunk
                for i in range(0, len(notes), chunk_size):
                    chunk = notes[i:i + chunk_size]
                    yield {
                        "event": "message",
                        "data": json.dumps({"type": "chunk", "data": chunk})
                    }
                    # Small delay to simulate streaming (optional)
                    await asyncio.sleep(0.02)

                # Notes complete
                yield {
                    "event": "message",
                    "data": json.dumps({"type": "notes_complete"})
                }

                # Send AI tools
                yield {
                    "event": "message",
                    "data": json.dumps({
                        "type": "tools",
                        "data": processing_result.ai_tools
                    })
                }

                # Complete
                print("🎉 Cached stream complete!\n")
                yield {
                    "event": "message",
                    "data": json.dumps({"type": "complete"})
                }
                return

            # ================================================================
            # FRESH PATH: Process new (API calls)
            # ================================================================
            print("🔄 Processing fresh (no cache or forced reprocess)")

            # Send cache indicator (not cached)
            if force:
                print("💪 Force reprocess requested")
                yield {
                    "event": "message",
                    "data": json.dumps({
                        "type": "cache",
                        "data": {"from_cache": False, "reason": "forced_reprocess"}
                    })
                }

            # ================================================================
            # Step 1: Fetch Transcript
            # ================================================================
            print("📹 Step 1: Fetching transcript...")
            yield {
                "event": "message",
                "data": json.dumps({"type": "status", "data": "Fetching transcript..."})
            }

            extractor = YouTubeTranscriptExtractor()
            transcript_data = extractor.extract(video_url)
            print(f"✅ Transcript fetched: {len(transcript_data.full_text)} chars")

            # Send video metadata and transcript
            yield {
                "event": "message",
                "data": json.dumps({
                    "type": "metadata",
                    "data": {
                        **transcript_data.metadata.model_dump(),
                        "transcript": transcript_data.full_text
                    }
                })
            }

            # Check for disconnect
            if await request.is_disconnected():
                return

            # ================================================================
            # Step 2: Stream Lecture Notes Generation
            # ================================================================
            print("📝 Step 2: Streaming lecture notes generation...")
            yield {
                "event": "message",
                "data": json.dumps({"type": "status", "data": "Generating lecture notes..."})
            }

            summarizer = LectureSummarizer()
            chunk_count = 0

            # Stream lecture notes chunks
            async for chunk in summarizer.summarize_stream(
                transcript=transcript_data.full_text,
                video_title=transcript_data.metadata.video_title
            ):
                # Check for disconnect
                if await request.is_disconnected():
                    print("⚠️  Client disconnected")
                    return

                chunk_count += 1
                yield {
                    "event": "message",
                    "data": json.dumps({"type": "chunk", "data": chunk})
                }

            print(f"✅ Lecture notes streamed: {chunk_count} chunks")

            # Notify frontend that notes generation is complete
            yield {
                "event": "message",
                "data": json.dumps({"type": "notes_complete"})
            }

            # ================================================================
            # Step 3: Extract AI Tools
            # ================================================================
            print("🔧 Step 3: Extracting AI tools...")
            yield {
                "event": "message",
                "data": json.dumps({"type": "status", "data": "Extracting AI tools..."})
            }

            tool_extractor = AIToolExtractor()
            ai_tools = tool_extractor.extract(
                transcript=transcript_data.full_text,
                video_title=transcript_data.metadata.video_title
            )
            print(f"✅ AI tools extracted: {len(ai_tools)} tools found")

            # Send complete tools list
            yield {
                "event": "message",
                "data": json.dumps({
                    "type": "tools",
                    "data": [tool.model_dump() for tool in ai_tools]
                })
            }

            # ================================================================
            # Step 4: Complete
            # ================================================================
            print("🎉 Stream processing complete!\n")
            yield {
                "event": "message",
                "data": json.dumps({"type": "complete"})
            }

        except ValueError as e:
            # Client error
            yield {
                "event": "error",
                "data": json.dumps({"type": "error", "error": str(e)})
            }
        except Exception as e:
            # Server error
            print(f"❌ Streaming error: {e}")
            import traceback
            traceback.print_exc()
            yield {
                "event": "error",
                "data": json.dumps({"type": "error", "error": f"Processing failed: {str(e)}"})
            }

    return EventSourceResponse(event_generator())


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
