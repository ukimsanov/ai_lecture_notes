# LectureFlow Backend

**Phase 0**: Minimal YouTube transcript extraction endpoint

## Setup Instructions

### 1. Create Virtual Environment

```bash
# From the backend directory
python3.11 -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your API keys
# GEMINI_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here
```

### 4. Run Development Server

```bash
# Method 1: Using uvicorn directly
uvicorn app.main:app --reload --port 8000

# Method 2: Using Python
python -m app.main

# Method 3: From app directory
cd app && python main.py
```

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Extract Transcript
```bash
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI application
│   ├── models.py         # Pydantic models
│   └── tools/
│       ├── __init__.py
│       └── youtube_tool.py  # YouTube transcript extractor
├── tests/                # Tests (coming in later phases)
├── requirements.txt      # Python dependencies
├── .env.example         # Environment variables template
└── README.md           # This file
```

## Testing the Endpoint

Try with this sample video (short AI lecture):
```bash
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=aircAruvnKk"}'
```

## Next Steps (Upcoming Phases)

- **Phase 1**: Add single-agent summarization with Gemini 2.5 Flash
- **Phase 2**: Implement multi-agent LangGraph orchestration
- **Phase 3**: Add database persistence and checkpointing
- **Phase 4**: WebSocket support for real-time updates

## Architecture Notes

Following black-box design principles:
- **YouTubeTranscriptExtractor**: Clean interface - input URL, output structured data
- **FastAPI endpoints**: RESTful, predictable responses
- **Error handling**: Consistent error format across all endpoints

Each module can be replaced independently without breaking the system.
