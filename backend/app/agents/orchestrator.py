"""
LangGraph Multi-Agent Orchestrator
Coordinates 3 agents using StateGraph for parallel execution

Architecture:
  User Input (YouTube URL)
      ↓
  fetch_transcript (Agent 1)
      ↓
  ┌─────────┴──────────┐
  │                    │
  summarize (Agent 2)  extract_tools (Agent 3)
  │                    │
  └─────────┬──────────┘
      ↓
  aggregate_results
      ↓
  Return MultiAgentResult
"""
from typing import TypedDict, List, Annotated
import operator
from langgraph.graph import StateGraph, START, END

from app.models import AITool, VideoMetadata
from app.tools import YouTubeTranscriptExtractor, LectureSummarizer, AIToolExtractor


# ============================================================================
# State Definitions - Following LangGraph 1.0.0 Best Practices
# ============================================================================

class OverallState(TypedDict):
    """
    Overall state schema containing ALL keys that can be read or written.
    This is the single source of truth for the graph state.

    Following LangGraph 1.0.0 best practices (October 2025):
    - Keys updated by multiple nodes use Annotated with reducer
    - Read-only keys don't need reducers
    """
    # Input (read-only)
    video_url: str

    # From Agent 1 (Transcript Fetcher)
    transcript: str
    video_metadata: dict

    # From Agent 2 (Summarizer) - Gemini
    lecture_notes: str

    # From Agent 3 (Tool Extractor) - GPT-4o-mini
    ai_tools: List[dict]

    # Execution tracking - uses reducer for parallel updates
    # Annotated with operator.add tells LangGraph to concatenate lists
    # when multiple nodes update this key concurrently
    agent_execution_order: Annotated[List[str], operator.add]


# Node-specific output types (what each node produces)
class TranscriptOutput(TypedDict):
    """Output schema for transcript fetcher node"""
    transcript: str
    video_metadata: dict
    agent_execution_order: list[str]


class SummarizerOutput(TypedDict):
    """Output schema for summarizer node"""
    lecture_notes: str
    agent_execution_order: list[str]


class ToolExtractorOutput(TypedDict):
    """Output schema for tool extractor node"""
    ai_tools: List[dict]
    agent_execution_order: list[str]


# ============================================================================
# Agent Node Functions
# ============================================================================

def fetch_transcript_node(state: OverallState) -> TranscriptOutput:
    """
    Agent 1: Extract transcript from YouTube video.
    Uses YouTubeTranscriptExtractor tool.

    Returns TranscriptOutput (subset of OverallState).
    """
    print("🎬 Agent 1: Fetching transcript...")

    extractor = YouTubeTranscriptExtractor()
    transcript_data = extractor.extract(state["video_url"])

    print(f"✅ Agent 1: Transcript fetched ({len(transcript_data.full_text)} chars)")

    # Return only what this node produces
    return {
        "transcript": transcript_data.full_text,
        "video_metadata": transcript_data.metadata.model_dump(),
        "agent_execution_order": ["fetch_transcript"]
    }


def summarize_node(state: OverallState) -> SummarizerOutput:
    """
    Agent 2: Generate lecture notes using Gemini 2.5 Flash.
    Runs in parallel with Agent 3.

    Returns SummarizerOutput (subset of OverallState).
    """
    print("📝 Agent 2: Generating lecture notes with Gemini...")

    summarizer = LectureSummarizer()
    video_title = state["video_metadata"].get("video_title")

    lecture_notes = summarizer.summarize(
        transcript=state["transcript"],
        video_title=video_title
    )

    print(f"✅ Agent 2: Lecture notes generated ({len(lecture_notes)} chars)")

    # Return only what this node produces
    return {
        "lecture_notes": lecture_notes,
        "agent_execution_order": ["summarize"]
    }


def extract_tools_node(state: OverallState) -> ToolExtractorOutput:
    """
    Agent 3: Extract AI tools using GPT-4o-mini.
    Runs in parallel with Agent 2.

    Returns ToolExtractorOutput (subset of OverallState).
    """
    print("🔧 Agent 3: Extracting AI tools with GPT-4o-mini...")

    extractor = AIToolExtractor()
    video_title = state["video_metadata"].get("video_title")

    ai_tools = extractor.extract(
        transcript=state["transcript"],
        video_title=video_title
    )

    print(f"✅ Agent 3: Extracted {len(ai_tools)} AI tools")

    # Return only what this node produces
    # Convert to dicts for JSON serialization
    return {
        "ai_tools": [tool.model_dump() for tool in ai_tools],
        "agent_execution_order": ["extract_tools"]
    }


# ============================================================================
# StateGraph Builder
# ============================================================================

def create_multi_agent_graph():
    """
    Create and compile the LangGraph StateGraph.

    Graph structure:
        START → fetch_transcript → [summarize, extract_tools] → END

    Agents 2 and 3 execute in parallel after Agent 1 completes.

    Uses OverallState as the state schema with node-specific output types.
    """
    # Create StateGraph with OverallState
    workflow = StateGraph(OverallState)

    # Add nodes (agents)
    workflow.add_node("fetch_transcript", fetch_transcript_node)
    workflow.add_node("summarize", summarize_node)
    workflow.add_node("extract_tools", extract_tools_node)

    # Add edges (flow control)
    # Start with transcript fetching
    workflow.add_edge(START, "fetch_transcript")

    # After fetching, BOTH summarize and extract_tools run in parallel
    # This is the key to parallel execution in LangGraph
    workflow.add_edge("fetch_transcript", "summarize")
    workflow.add_edge("fetch_transcript", "extract_tools")

    # Both parallel nodes end the graph when they complete
    workflow.add_edge("summarize", END)
    workflow.add_edge("extract_tools", END)

    # Compile the graph
    app = workflow.compile()

    print("✅ LangGraph StateGraph compiled successfully")
    print("📊 Graph structure: START → fetch_transcript → [summarize, extract_tools] → END")

    return app


# ============================================================================
# Orchestrator Class (Black Box Interface)
# ============================================================================

class MultiAgentOrchestrator:
    """
    Multi-agent orchestrator using LangGraph StateGraph.

    Black box interface:
    - Input: YouTube URL (string)
    - Output: Complete processed result with lecture notes + AI tools

    Internal implementation uses LangGraph for parallel agent execution.
    """

    def __init__(self):
        """Initialize the orchestrator with compiled StateGraph"""
        self.graph = create_multi_agent_graph()

    def process(self, video_url: str) -> dict:
        """
        Main interface: Process video through multi-agent system.

        Args:
            video_url: YouTube video URL

        Returns:
            dict with all results (transcript, notes, tools, metadata)
        """
        # Initialize state
        initial_state = {
            "video_url": video_url,
            "transcript": "",
            "video_metadata": {},
            "lecture_notes": "",
            "ai_tools": [],
            "agent_execution_order": []
        }

        print(f"\n🚀 Starting multi-agent processing for: {video_url}\n")

        # Run the graph
        # LangGraph automatically handles parallel execution
        final_state = self.graph.invoke(initial_state)

        print(f"\n✅ Multi-agent processing complete!")
        print(f"📋 Agent execution order: {' → '.join(final_state['agent_execution_order'])}\n")

        return final_state
