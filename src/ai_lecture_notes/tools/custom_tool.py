# Standard library imports
import os
import json
import re
from typing import Dict, List, Optional, Any

# Third-party imports
from crewai.tools import BaseTool
from youtube_transcript_api._api import YouTubeTranscriptApi
from langchain_text_splitters import RecursiveCharacterTextSplitter
import yt_dlp
from pydantic import BaseModel


class TranscriptChunk(BaseModel):
    chunk_id: str
    text: str
    start_time: float  # Keep only the start time for reference


class VideoData(BaseModel):
    video_id: str
    video_title: str
    video_url: str
    # Only keep essential metadata fields
    channel_name: str
    transcript_chunks: List[TranscriptChunk]


class YouTubeTranscriptTool(BaseTool):
    name: str = "YouTube Transcript Extractor"
    description: str = """
    Extracts transcripts and metadata from YouTube videos. 
    Input should be a YouTube video URL.
    Returns structured JSON with video metadata and chunked transcript data.
    """

    def _run(self, video_url: str) -> str:
        try:
            # Extract video ID from URL
            video_id = self._extract_video_id(video_url)
            if not video_id:
                return json.dumps({"error": "Invalid YouTube URL provided"})

            # Get video metadata using yt-dlp
            metadata = self._get_video_metadata(video_url)
            
            # Get transcript
            transcript_data = self._get_transcript(video_id)
            if not transcript_data:
                return json.dumps({"error": "No transcript available for this video"})

            # Process and chunk transcript
            chunks = self._process_transcript(transcript_data, video_id)

            # Create structured response
            video_data = VideoData(
                video_id=video_id,
                video_title=metadata.get('title', 'Unknown Title'),
                video_url=video_url,
                channel_name=metadata.get('uploader', ''),
                transcript_chunks=chunks
            )

            return video_data.model_dump_json(indent=2)

        except Exception as e:
            return json.dumps({"error": f"Failed to process video: {str(e)}"})

    def _extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:embed\/)([0-9A-Za-z_-]{11})',
            r'(?:v\/)([0-9A-Za-z_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    def _get_video_metadata(self, video_url: str) -> Dict[str, Any]:
        """Get minimal video metadata using yt-dlp"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,  # Ensure we don't download any media
                'extract_flat': True,   # Only fetch metadata, not all formats
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                if info is None:
                    return {}
                # Only extract the metadata we actually need
                return {
                    'title': info.get('title'),
                    'uploader': info.get('uploader')
                }
        except Exception as e:
            print(f"Warning: Could not fetch metadata: {e}")
            return {}

    def _get_transcript(self, video_id: str) -> Optional[List[Dict]]:
        """Get transcript using youtube-transcript-api"""
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # Try to get English transcript first
            try:
                transcript = transcript_list.find_transcript(['en'])
            except:
                # Fall back to any available transcript
                transcript = transcript_list.find_generated_transcript(['en'])
            
            raw_data = transcript.fetch()
            
            # Token-optimized version: Only keep essential information
            # For main content analysis, we only need the text
            # Keep start times only for referencing purposes
            data_list = [
                {"text": item.text, "start": item.start}
                for item in raw_data
            ]
            return data_list
        except Exception as e:
            print(f"Transcript extraction failed: {e}")
            return None

    def _process_transcript(self, transcript_data: List[Dict], video_id: str) -> List[TranscriptChunk]:
        """Process transcript into semantic chunks"""
        # Combine transcript text with timestamps
        full_text = ""
        timestamp_map = []
        
        for entry in transcript_data:
            start_pos = len(full_text)
            text = entry['text']
            full_text += text + " "
            end_pos = len(full_text)
            
            timestamp_map.append({
                'start_pos': start_pos,
                'end_pos': end_pos,
                'start_time': entry['start']
            })

        # Split text into semantic chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        text_chunks = text_splitter.split_text(full_text)
        
        # Map chunks back to timestamps - token optimized version
        chunks = []
        for i, chunk_text in enumerate(text_chunks):
            chunk_start_pos = full_text.find(chunk_text)
            
            # Find corresponding timestamp - just need start time for reference
            start_time = 0
            
            for entry in timestamp_map:
                if entry['start_pos'] <= chunk_start_pos <= entry['end_pos']:
                    start_time = entry['start_time']
                    break
            
            chunks.append(TranscriptChunk(
                chunk_id=f"{video_id}_chunk_{i+1}",
                text=chunk_text.strip(),
                start_time=start_time
            ))
        
        return chunks