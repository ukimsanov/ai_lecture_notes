"""
GPT-4o-mini AI Tool Extractor
Uses GPT-4o-mini with structured outputs for precise entity extraction

Black box interface:
- Input: Transcript text (string)
- Output: List of AI tools (List[AITool])
"""
import os
from typing import List
from openai import OpenAI
from pydantic import BaseModel, Field

from app.models import AITool


class ToolExtractionResult(BaseModel):
    """Pydantic model for structured output from GPT-4o-mini"""
    tools: List[AITool] = Field(
        default_factory=list,
        description="List of AI tools, frameworks, libraries, models, or platforms mentioned"
    )


class AIToolExtractor:
    """
    Extracts AI tools/frameworks/libraries from lecture transcripts using GPT-4o-mini.

    Black box interface - implementation details hidden.
    Uses structured outputs for reliable JSON parsing.
    """

    def __init__(self):
        """
        Initialize the extractor with GPT-4o-mini.
        API key loaded from OPENAI_API_KEY environment variable.
        """
        # Get API key from environment
        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            raise ValueError("OPENAI_API_KEY must be set in environment")

        # Create OpenAI client
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"

    def extract(self, transcript: str, video_title: str = None) -> List[AITool]:
        """
        Main interface: Extract AI tools from transcript.

        Args:
            transcript: Full transcript text
            video_title: Optional video title for context

        Returns:
            List of AITool objects

        Raises:
            Exception: If extraction fails
        """
        # Build the prompt
        prompt = self._build_prompt(transcript, video_title)

        # Extract using GPT-4o-mini with structured outputs
        # Verified October 2025: Use beta.chat.completions.parse() for Pydantic
        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at identifying AI tools, frameworks, libraries, models, and platforms mentioned in technical content."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format=ToolExtractionResult
        )

        # Extract the parsed response
        result = response.choices[0].message.parsed

        return result.tools if result else []

    # =========================================================================
    # PRIVATE METHODS - Implementation details hidden from interface
    # =========================================================================

    def _build_prompt(self, transcript: str, video_title: str = None) -> str:
        """
        Build optimized prompt for GPT-4o-mini entity extraction.
        Based on 2025 structured output best practices.
        """
        title_context = f"Video Title: {video_title}\n\n" if video_title else ""

        prompt = f"""{title_context}**Task**: Extract ALL AI-related tools, frameworks, libraries, models, and platforms mentioned in the following transcript.

**What to extract**:
- AI frameworks (e.g., TensorFlow, PyTorch, LangChain, CrewAI)
- Libraries (e.g., NumPy, Pandas, Transformers)
- Models (e.g., GPT-4, Gemini, Claude, Llama)
- Platforms (e.g., Hugging Face, OpenAI API, AWS SageMaker)
- Services (e.g., Pinecone, Weaviate, Anthropic)

**For each tool, provide**:
1. **tool_name**: Exact name of the tool
2. **category**: One of: framework, library, model, platform, service
3. **context_snippet**: Brief quote or paraphrase where it was mentioned (max 100 chars)
4. **timestamp**: null (we don't have precise timestamps)
5. **confidence_score**: 0.0-1.0 based on how clearly it was mentioned
6. **usage_context**: How the tool is being used or discussed (1-2 sentences)

**Important**:
- Only extract tools that are CLEARLY mentioned
- Use confidence_score to indicate certainty (0.9-1.0 for explicit mentions, 0.5-0.8 for implicit)
- Return empty list if no AI tools are mentioned
- Be precise with names (e.g., "GPT-4" not "GPT", "LangChain" not "Langchain")

**Transcript**:
{transcript}

**Output**: JSON following the ToolExtractionResult schema."""

        return prompt
