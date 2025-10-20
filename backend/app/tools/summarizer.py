"""
Gemini-powered Lecture Summarizer
Uses Gemini 2.5 Flash for cost-effective, high-quality summarization

Black box interface:
- Input: Transcript text (string)
- Output: Markdown-formatted lecture notes (string)
"""
import os
from typing import Optional
from google import genai


class LectureSummarizer:
    """
    Summarizes lecture transcripts into structured notes using Gemini 2.5 Flash.

    Black box interface - implementation details hidden.
    Can be replaced with any other summarization approach without breaking the API.
    """

    def __init__(self):
        """
        Initialize the summarizer with Gemini 2.5 Flash.
        API key is loaded from GEMINI_API_KEY or GOOGLE_API_KEY environment variable.
        """
        # Explicitly get API key from environment
        # Try GEMINI_API_KEY first, fallback to GOOGLE_API_KEY
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        if not api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY must be set in environment")

        # Create client with explicit API key
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"

    def summarize(
        self,
        transcript: str,
        video_title: Optional[str] = None
    ) -> str:
        """
        Main interface: Summarize transcript into structured lecture notes.

        Args:
            transcript: Full transcript text
            video_title: Optional video title for context

        Returns:
            Markdown-formatted lecture notes

        Raises:
            Exception: If summarization fails
        """
        # Build the prompt
        prompt = self._build_prompt(transcript, video_title)

        # Generate summary using Gemini
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt
        )

        # Extract text from response
        return response.text

    # =========================================================================
    # PRIVATE METHODS - Implementation details hidden from interface
    # =========================================================================

    def _build_prompt(
        self,
        transcript: str,
        video_title: Optional[str] = None
    ) -> str:
        """
        Build optimized prompt for Gemini 2.5 Flash.
        Based on 2025 best practices for summarization.
        """
        title_context = f"Video Title: {video_title}\n\n" if video_title else ""

        # Prompt based on verified 2025 best practices:
        # - Concise and specific
        # - Clear output format
        # - Focus on actionable insights
        prompt = f"""You are an expert at creating concise, high-quality lecture notes from video transcripts.

{title_context}**Task**: Create structured lecture notes from the following transcript.

**Requirements**:
1. **Executive Summary**: 1 short paragraph (3-4 sentences) capturing the main point
2. **Key Concepts**: 3-5 main topics, each with:
   - Clear heading (## format)
   - 2-3 bullet points explaining the concept
   - Bold important terms
3. **Key Takeaways**: 3-5 actionable insights as bullet points

**Format**: Markdown with proper headings, bullets, and bold formatting.

**Style**:
- Prioritize clarity over completeness
- Use technical terms accurately
- Focus on understanding, not transcription
- Target length: 300-400 words

**Transcript**:
{transcript}

**Output** (Markdown format):"""

        return prompt
