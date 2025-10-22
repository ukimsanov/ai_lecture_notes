"""
History API Router
Provides endpoints for viewing and managing processing history

Black box interface:
- GET /api/history - List all processed videos with pagination
- GET /api/history/{id} - Get specific processing result details
- DELETE /api/history/{id} - Delete processing result

Following FastAPI 0.115+ and SQLAlchemy 2.0 best practices (Oct 2025)
"""
from typing import Annotated
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    HistoryListResponse,
    HistoryItemSummary,
    HistoryDetailResponse,
    DeleteHistoryResponse,
    MultiAgentResult,
    VideoMetadata,
    AITool
)
from app.database import get_db
from app.database.models import Video, ProcessingResult


# ============================================================================
# Router Configuration
# ============================================================================

router = APIRouter(
    prefix="/api/history",
    tags=["history"],
    responses={404: {"description": "Not found"}},
)


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("", response_model=HistoryListResponse, status_code=status.HTTP_200_OK)
async def get_history_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    search: str = Query(None, description="Search by video title or channel name")
) -> HistoryListResponse:
    """
    Get paginated list of all processed videos.

    Returns summary information for each processing result,
    sorted by processing date (newest first).

    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Results per page (default: 20, max: 100)
    - search: Optional search term for title/channel filtering

    Returns:
    - List of history items with metadata
    - Pagination information (total, page, page_size)
    """
    try:
        # Calculate offset for pagination
        offset = (page - 1) * page_size

        # Build base query joining processing_results with videos
        query = (
            select(
                ProcessingResult.id,
                Video.video_id,
                Video.title,
                Video.channel_name,
                Video.duration,
                ProcessingResult.ai_tools_count,
                ProcessingResult.processing_time_seconds,
                ProcessingResult.created_at
            )
            .join(Video, ProcessingResult.video_id == Video.id)
            .order_by(desc(ProcessingResult.created_at))
        )

        # Apply search filter if provided
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Video.title.ilike(search_filter)) |
                (Video.channel_name.ilike(search_filter))
            )

        # Get total count (before pagination)
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        query = query.offset(offset).limit(page_size)

        # Execute query
        result = await db.execute(query)
        rows = result.all()

        # Convert to Pydantic models
        history_items = [
            HistoryItemSummary(
                id=str(row.id),
                video_id=row.video_id,
                video_title=row.title,
                channel_name=row.channel_name,
                duration=row.duration,
                ai_tools_count=row.ai_tools_count,
                processing_time_seconds=row.processing_time_seconds,
                processed_at=row.created_at.isoformat()
            )
            for row in rows
        ]

        return HistoryListResponse(
            success=True,
            data=history_items,
            total=total,
            page=page,
            page_size=page_size,
            error=None
        )

    except Exception as e:
        print(f"❌ History list error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history: {str(e)}"
        )


@router.get("/{result_id}", response_model=HistoryDetailResponse, status_code=status.HTTP_200_OK)
async def get_history_detail(
    result_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> HistoryDetailResponse:
    """
    Get complete details for a specific processing result.

    Returns:
    - Full lecture notes
    - All extracted AI tools
    - Video metadata
    - Processing information

    Raises:
    - 404: If processing result not found
    """
    try:
        # Query for processing result with video metadata
        query = (
            select(ProcessingResult, Video)
            .join(Video, ProcessingResult.video_id == Video.id)
            .where(ProcessingResult.id == result_id)
        )

        result = await db.execute(query)
        row = result.first()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Processing result {result_id} not found"
            )

        processing_result, video = row

        # Build response matching MultiAgentResult structure
        video_metadata = VideoMetadata(
            video_id=video.video_id,
            video_title=video.title,
            video_url=video.video_url,
            channel_name=video.channel_name,
            duration=video.duration
        )

        # Convert AI tools from JSON to Pydantic models
        ai_tools = [AITool(**tool) for tool in processing_result.ai_tools]

        result_data = MultiAgentResult(
            video_metadata=video_metadata,
            lecture_notes=processing_result.lecture_notes,
            ai_tools=ai_tools,
            processing_time=processing_result.processing_time_seconds,
            agent_execution_order=processing_result.agent_execution_order
        )

        return HistoryDetailResponse(
            success=True,
            data=result_data,
            processed_at=processing_result.created_at.isoformat(),
            error=None
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ History detail error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history detail: {str(e)}"
        )


@router.delete("/{result_id}", response_model=DeleteHistoryResponse, status_code=status.HTTP_200_OK)
async def delete_history_item(
    result_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> DeleteHistoryResponse:
    """
    Delete a specific processing result.

    This removes the processing result record but keeps the video metadata
    for potential reprocessing in the future.

    Returns:
    - Success message

    Raises:
    - 404: If processing result not found
    """
    try:
        # Query for processing result
        query = select(ProcessingResult).where(ProcessingResult.id == result_id)
        result = await db.execute(query)
        processing_result = result.scalar_one_or_none()

        if not processing_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Processing result {result_id} not found"
            )

        # Delete the processing result
        await db.delete(processing_result)
        # Commit happens automatically via get_db dependency

        return DeleteHistoryResponse(
            success=True,
            message=f"Processing result {result_id} deleted successfully",
            error=None
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ History delete error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete history item: {str(e)}"
        )
