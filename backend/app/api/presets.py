"""
Presets API Router
Provides curated demo videos for quick testing

Black box interface:
- GET /api/presets - Returns list of preset demo videos

Following FastAPI 0.115+ best practices (Oct 2025)
"""
from typing import List
from fastapi import APIRouter, status
from pydantic import BaseModel


# ============================================================================
# Pydantic Models
# ============================================================================

class PresetVideo(BaseModel):
    """Preset video for demo purposes"""
    id: str
    title: str
    channel: str
    duration_seconds: int
    thumbnail_url: str
    video_url: str
    description: str
    tags: List[str]


class PresetsResponse(BaseModel):
    """Response model for presets endpoint"""
    success: bool
    data: List[PresetVideo]


# ============================================================================
# Router Configuration
# ============================================================================

router = APIRouter(
    prefix="/api/presets",
    tags=["presets"],
)


# ============================================================================
# Curated Preset Videos
# ============================================================================

PRESET_VIDEOS = [
    PresetVideo(
        id="zjkBMFhNj_g",
        title="Intro to Large Language Models",
        channel="Andrej Karpathy",
        duration_seconds=3588,
        thumbnail_url="https://i.ytimg.com/vi/zjkBMFhNj_g/maxresdefault.jpg",
        video_url="https://www.youtube.com/watch?v=zjkBMFhNj_g",
        description="Comprehensive 1-hour introduction to LLMs by renowned AI researcher Andrej Karpathy. Covers fundamentals, training, and applications.",
        tags=["LLM", "AI Fundamentals", "Deep Learning"]
    ),
    PresetVideo(
        id="kCc8FmEb1nY",
        title="Let's build GPT: from scratch, in code, spelled out",
        channel="Andrej Karpathy",
        duration_seconds=7364,
        thumbnail_url="https://i.ytimg.com/vi/kCc8FmEb1nY/maxresdefault.jpg",
        video_url="https://www.youtube.com/watch?v=kCc8FmEb1nY",
        description="Build GPT from scratch with detailed explanations. Learn the architecture behind modern language models through hands-on coding.",
        tags=["GPT", "Coding", "Transformers", "Tutorial"]
    ),
    PresetVideo(
        id="LCEmiRjPEtQ",
        title="Software Is Changing (Again)",
        channel="Y Combinator",
        duration_seconds=2371,
        thumbnail_url="https://i.ytimg.com/vi/LCEmiRjPEtQ/maxresdefault.jpg",
        video_url="https://www.youtube.com/watch?v=LCEmiRjPEtQ",
        description="Andrej Karpathy's insights on how AI is fundamentally changing software development and engineering practices.",
        tags=["AI", "Software Engineering", "Future of Tech"]
    ),
    PresetVideo(
        id="9AQOvT8LnMI",
        title="Wisdom-Driven Knowledge Augmented Generation at Scale",
        channel="AI Engineer",
        duration_seconds=1123,
        thumbnail_url="https://i.ytimg.com/vi/9AQOvT8LnMI/maxresdefault.jpg",
        video_url="https://www.youtube.com/watch?v=9AQOvT8LnMI",
        description="Advanced RAG techniques and knowledge graphs for building expert AI systems.",
        tags=["RAG", "Knowledge Graphs", "AI Engineering"]
    ),
    PresetVideo(
        id="bZQun8Y4L2A",
        title="How Large Language Models Work",
        channel="Google for Developers",
        duration_seconds=1006,
        thumbnail_url="https://i.ytimg.com/vi/bZQun8Y4L2A/maxresdefault.jpg",
        video_url="https://www.youtube.com/watch?v=bZQun8Y4L2A",
        description="Clear explanation of how LLMs function, from tokenization to attention mechanisms.",
        tags=["LLM", "Explainer", "Google", "Beginner Friendly"]
    ),
    PresetVideo(
        id="aircAruvnKk",
        title="But what is a neural network?",
        channel="3Blue1Brown",
        duration_seconds=1155,
        thumbnail_url="https://i.ytimg.com/vi/aircAruvnKk/maxresdefault.jpg",
        video_url="https://www.youtube.com/watch?v=aircAruvnKk",
        description="Visual intuition for how neural networks work. Perfect for beginners wanting to understand the fundamentals.",
        tags=["Neural Networks", "Visual Learning", "Fundamentals"]
    ),
    PresetVideo(
        id="VMj-3S1tku0",
        title="Attention in transformers, visually explained",
        channel="3Blue1Brown",
        duration_seconds=1728,
        thumbnail_url="https://i.ytimg.com/vi/VMj-3S1tku0/maxresdefault.jpg",
        video_url="https://www.youtube.com/watch?v=VMj-3S1tku0",
        description="Beautiful visual explanation of the attention mechanism that powers modern AI. Highly acclaimed tutorial.",
        tags=["Transformers", "Attention", "Visual Learning"]
    ),
]


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("", response_model=PresetsResponse, status_code=status.HTTP_200_OK)
async def get_presets() -> PresetsResponse:
    """
    Get curated list of preset demo videos.

    These videos are hand-picked for demonstration purposes:
    - Educational AI/tech content
    - Variety of lengths (short, medium, long)
    - High-quality lectures from recognized speakers
    - Likely already cached for fast demo

    Returns:
        List of preset videos with metadata
    """
    return PresetsResponse(
        success=True,
        data=PRESET_VIDEOS
    )
