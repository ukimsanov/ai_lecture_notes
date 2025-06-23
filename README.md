# AI Lecture Notes Generator

A powerful AI a### As a Module

```python
from ai_lecture_notes.crew import AiLectureNotes
from pathlib import Path

# Initialize the crew with default output directory
crew = AiLectureNotes()

# Or specify a custom output directory
custom_output_dir = Path("my_custom_output_directory")
crew = AiLectureNotes(output_dir=custom_output_dir)

# Process a YouTube video
result = crew.kickoff_crew("https://www.youtube.com/watch?v=your_video_id")
```omatically processes YouTube educational videos into comprehensive lecture notes and extracts mentioned AI tools.

## Features

- **Transcript Extraction**: Downloads and processes YouTube video transcripts
- **Smart Lecture Notes**: Generates well-structured, professional lecture notes in Markdown format
- **AI Tool Extraction**: Identifies and catalogues AI tools mentioned in the lecture
- **Multi-LLM Approach**: Leverages multiple LLMs for cost-effective processing
- **Unique Output Directories**: Creates a separate output folder for each processed video
- **Token Optimization**: Minimizes token usage for cost-effectiveness
- **Error Handling**: Robust error handling and validation

## Requirements

- Python 3.10+
- Google Gemini API key
- Anthropic Claude API key

## Installation

1. Clone this repository
2. Create a virtual environment: `python -m venv .venv`
3. Activate the virtual environment:
   - Windows: `.venv\Scripts\activate`
   - macOS/Linux: `source .venv/bin/activate`
4. Install dependencies: `pip install -e .`
5. Copy `.env.example` to `.env` and add your API keys

## Usage

### Command Line

```bash
# Process a YouTube video
python -m ai_lecture_notes.main https://www.youtube.com/watch?v=your_video_id

# Or run and enter the URL when prompted
python -m ai_lecture_notes.main

# Run a test with a pre-defined video
python -m ai_lecture_notes.main test
```

### As a Module

```python
from ai_lecture_notes.crew import AiLectureNotes
from pathlib import Path

# Initialize the crew with default output directory
crew = AiLectureNotes()

# Or specify a custom output directory
custom_output_dir = Path("my_custom_output_directory")
crew = AiLectureNotes(output_dir=custom_output_dir)

# Process a video
result = crew.kickoff_crew("https://www.youtube.com/watch?v=your_video_id")
```

# Process a YouTube video
result = crew.kickoff_crew("https://www.youtube.com/watch?v=your_video_id")
```

## Project Structure

- `src/ai_lecture_notes/`: Main package
  - `crew.py`: CrewAI configuration
  - `main.py`: Entry point script
  - `config/`: YAML configuration files
    - `agents.yaml`: Agent definitions
    - `tasks.yaml`: Task definitions
  - `tools/`: Custom tools
    - `custom_tool.py`: YouTube transcript extraction tool

## Output

For each processed video, a unique output directory is created in the `output/` folder, named with a timestamp and the video ID. Each directory contains:

- `lecture_notes.md`: Comprehensive lecture notes
- `ai_tools.json`: List of AI tools mentioned in the video
- `crew_log.txt`: Execution log

Example: `output/20240728_123045_dQw4w9WgXcQ/`

## License

MIT
