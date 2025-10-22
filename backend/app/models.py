"""
Pydantic models for LectureFlow API
"""
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class TranscriptChunk(BaseModel):
    """Individual chunk of transcript with timestamp"""
    chunk_id: str
    text: str
    start_time: float = Field(..., description="Start time in seconds")


class VideoMetadata(BaseModel):
    """YouTube video metadata"""
    video_id: str
    video_title: str
    video_url: str
    channel_name: str
    duration: Optional[int] = None  # Duration in seconds


class TranscriptData(BaseModel):
    """Complete transcript data with metadata"""
    metadata: VideoMetadata
    transcript_chunks: List[TranscriptChunk]
    full_text: str = Field(..., description="Complete transcript as single text")


class ExtractRequest(BaseModel):
    """Request model for transcript extraction"""
    video_url: str = Field(..., description="YouTube video URL")


class ExtractResponse(BaseModel):
    """Response model for transcript extraction"""
    success: bool
    data: Optional[TranscriptData] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    message: str


# ============================================================================
# Phase 1: Processing Models (Single-Agent)
# ============================================================================

class ProcessRequest(BaseModel):
    """Request model for processing a YouTube video"""
    video_url: str = Field(..., description="YouTube video URL")


class ProcessedResult(BaseModel):
    """Processed lecture notes from video"""
    video_metadata: VideoMetadata
    lecture_notes: str = Field(..., description="Markdown-formatted lecture notes")
    processing_time: float = Field(..., description="Time taken to process (seconds)")


class ProcessResponse(BaseModel):
    """Response model for video processing"""
    success: bool
    data: Optional[ProcessedResult] = None
    error: Optional[str] = None


# ============================================================================
# Phase 2: Multi-Agent Models (LangGraph)
# ============================================================================

class AITool(BaseModel):
    """Individual AI tool extracted from transcript"""
    tool_name: str = Field(..., description="Name of the AI tool/framework/library")
    category: str = Field(..., description="Category: framework, library, model, platform, service")
    context_snippet: str = Field(..., description="Brief context where tool was mentioned")
    timestamp: Optional[float] = Field(None, description="Approximate timestamp in video (seconds)")
    confidence_score: float = Field(..., description="Confidence score 0.0-1.0", ge=0.0, le=1.0)
    usage_context: str = Field(..., description="How the tool is being used/discussed")


class MultiAgentResult(BaseModel):
    """Complete result from multi-agent processing"""
    video_metadata: VideoMetadata
    lecture_notes: str = Field(..., description="Markdown-formatted lecture notes from Gemini")
    ai_tools: List[AITool] = Field(default_factory=list, description="AI tools extracted by GPT-4o-mini")
    processing_time: float = Field(..., description="Total time taken to process (seconds)")
    agent_execution_order: List[str] = Field(
        default_factory=list,
        description="Order of agent execution for debugging"
    )


class MultiAgentResponse(BaseModel):
    """Response model for multi-agent video processing"""
    success: bool
    data: Optional[MultiAgentResult] = None
    error: Optional[str] = None


# ============================================================================
# Phase 5: History API Models
# ============================================================================

class HistoryItemSummary(BaseModel):
    """Summary of a processing result for history list"""
    id: str = Field(..., description="Processing result UUID")
    video_id: str = Field(..., description="YouTube video ID")
    video_title: str = Field(..., description="Video title")
    channel_name: Optional[str] = Field(None, description="Channel name")
    duration: Optional[int] = Field(None, description="Video duration in seconds")
    ai_tools_count: int = Field(..., description="Number of AI tools extracted")
    processing_time_seconds: float = Field(..., description="Processing time")
    processed_at: str = Field(..., description="ISO timestamp when processed")

    class Config:
        from_attributes = True


class HistoryListResponse(BaseModel):
    """Response model for history list endpoint"""
    success: bool
    data: Optional[List[HistoryItemSummary]] = None
    total: int = Field(0, description="Total number of results")
    page: int = Field(1, description="Current page number")
    page_size: int = Field(20, description="Results per page")
    error: Optional[str] = None


class HistoryDetailResponse(BaseModel):
    """Response model for single history item with full details"""
    success: bool
    data: Optional[MultiAgentResult] = None
    processed_at: Optional[str] = Field(None, description="ISO timestamp when processed")
    error: Optional[str] = None


class DeleteHistoryResponse(BaseModel):
    """Response model for delete history endpoint"""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
