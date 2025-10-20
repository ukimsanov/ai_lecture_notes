# NoteLens - Complete Project State
**Last Updated:** 2025-10-20 (Phase 1 Complete)

## Project Overview

**Name:** NoteLens
**Purpose:** AI-powered YouTube lecture notes generator with multi-agent orchestration (portfolio showcase project)
**Current Phase:** Phase 1 Complete - Single-agent processing with Gemini 2.5 Flash

## Technology Stack (Verified October 2025)

### Backend
- **Python:** 3.13.7
- **Framework:** FastAPI 0.115.0
- **Server:** Uvicorn 0.32.0 (with auto-reload)
- **AI/LLM:** google-genai 1.0.0 (Gemini 2.5 Flash)
- **YouTube:** youtube-transcript-api 1.2.3, yt-dlp 2025.10.14
- **Data Validation:** Pydantic 2.9.0
- **Environment:** python-dotenv 1.0.1

### API Keys Required
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) - for Gemini 2.5 Flash
- `OPENAI_API_KEY` - for Phase 2 (GPT-4o-mini tool extraction)

## Completed Phases

### ✅ Phase 0: Backend Structure & Transcript Extraction
**Files Created:**
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app with CORS, error handling
│   ├── models.py            # Pydantic models
│   └── tools/
│       ├── __init__.py
│       └── youtube_tool.py  # YouTube transcript extractor
├── requirements.txt
├── .env.example
├── .env (user's actual keys)
├── .gitignore
└── README.md
```

**Key Learnings:**
1. **youtube-transcript-api 1.2.3 API Change:**
   - OLD: `YouTubeTranscriptApi.list_transcripts(video_id)`
   - NEW: `api = YouTubeTranscriptApi(); api.fetch(video_id, languages=['en'])`
   - Returns `FetchedTranscriptSnippet` objects with `.text` and `.start` attributes

2. **Black-Box Design:**
   - `YouTubeTranscriptExtractor` has clean interface:
     - Input: YouTube URL (string)
     - Output: TranscriptData (Pydantic model)
     - Implementation fully hidden, replaceable

**Working Endpoints:**
- `GET /health` - Health check
- `GET /` - API info
- `POST /api/extract` - Extract transcript only

### ✅ Phase 1: Gemini 2.5 Flash Integration
**Files Added/Modified:**
```
backend/app/
├── tools/
│   └── summarizer.py        # NEW: LectureSummarizer with Gemini
└── models.py                # ADDED: ProcessRequest, ProcessedResult, ProcessResponse
```

**Key Learnings:**
1. **Gemini API Key Loading:**
   - Must explicitly pass API key to client
   - `api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")`
   - `client = genai.Client(api_key=api_key)`
   - Auto-detection via environment variable alone doesn't work reliably

2. **Prompt Engineering (2025 Best Practices):**
   - Concise and specific instructions
   - Clear output format (Markdown)
   - Focus on actionable insights
   - Target length: 300-400 words
   - Structure: Executive Summary + Key Concepts + Key Takeaways

3. **Model Choice:**
   - Using `gemini-2.5-flash` for cost-effectiveness
   - Processing time: ~14 seconds for 19-second video
   - Output quality: Excellent (1265 chars for 217 char transcript)

**Working Endpoints:**
- `POST /api/process` - Extract + Summarize with Gemini ✨

**Test Results:**
```json
{
  "success": true,
  "data": {
    "video_metadata": {
      "video_id": "jNQXAC9IVRw",
      "video_title": "Me at the zoo",
      "channel_name": "jawed",
      "duration": 19
    },
    "lecture_notes": "...well-formatted markdown...",
    "processing_time": 14.16
  }
}
```

## Verified Research & Documentation

### FastAPI (2025)
- **CORS:** Use specific origins, not "*" for security
- **Lifespan:** Use `@asynccontextmanager` for startup/shutdown (FastAPI 0.115+)
- **Error Handling:** Global exception handler for consistent responses
- **Environment Variables:** Use python-dotenv for .env file loading

### youtube-transcript-api 1.2.3
- **Breaking Change:** Version 1.2.3 (Oct 2025) changed API from class methods to instance methods
- **Correct Usage:** Create instance, call `fetch()` with languages parameter
- **Returns:** List of `FetchedTranscriptSnippet` objects (not dicts)

### google-genai SDK 1.0.0
- **Installation:** `pip install google-genai`
- **Client Creation:** `genai.Client(api_key="YOUR_KEY")`
- **Generate Content:** `client.models.generate_content(model="gemini-2.5-flash", contents=prompt)`
- **Response:** `response.text` contains generated content
- **Environment Variable:** Supports `GEMINI_API_KEY` or `GOOGLE_API_KEY`

### Railway Deployment (For Phase 7)
- Use Nixpacks builder or custom Dockerfile
- FastAPI start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set environment variables in Railway dashboard

### Next.js 15 (For Phase 4)
- **App Router:** Stable and recommended
- **Server Actions:** Security improvements in Next.js 15
- **React 19:** Supported with backwards compatibility
- **shadcn/ui:** Uses next-themes for dark mode

### LangGraph 1.0.0 (For Phase 2 - NOT YET IMPLEMENTED)
- **Latest Version:** Released October 17, 2025
- **Requires:** Python >=3.10
- **Core Components:** StateGraph, nodes (functions), edges (flow control)
- **Checkpointing:** `langgraph-checkpoint-postgres` for persistence
- **Best Practice:** Use StateGraph for stateful multi-agent workflows

## Architecture Decisions

### Black-Box Design Principles
Every module follows these rules:
1. **Clean Interface:** Input/Output clearly defined
2. **Hidden Implementation:** Internal details not exposed
3. **Replaceable:** Can rewrite from scratch using only interface
4. **Single Responsibility:** One module = one developer can maintain it

### Current Module Boundaries

**YouTubeTranscriptExtractor:**
- Interface: `extract(video_url: str) -> TranscriptData`
- Responsibility: Extract and chunk YouTube transcripts
- Replaceable: Yes - just implement same interface

**LectureSummarizer:**
- Interface: `summarize(transcript: str, video_title: Optional[str]) -> str`
- Responsibility: Generate markdown lecture notes
- Replaceable: Yes - can swap Gemini for Claude, GPT, etc.

## Known Issues & Fixes

### Issue 1: youtube-transcript-api API Changed
**Problem:** `list_transcripts()` method doesn't exist in 1.2.3
**Solution:** Use instance method `fetch()` instead
**Status:** ✅ Fixed

### Issue 2: Gemini API Key Not Detected
**Problem:** `genai.Client()` without explicit API key failed
**Solution:** Pass API key explicitly from environment
**Status:** ✅ Fixed

### Issue 3: Path Handling in Original Repo
**Problem:** CrewAI created duplicate nested directory structures
**Solution:** Use relative paths, avoided in new implementation
**Status:** ✅ Avoided in NoteLens

## Environment Setup

```bash
# 1. Create virtual environment
cd backend
python3.11 -m venv venv
source venv/bin/activate  # macOS/Linux

# 2. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with actual API keys

# 4. Run server
uvicorn app.main:app --reload --port 8000
```

## Testing

### Test Transcript Extraction
```bash
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

### Test Full Processing (Gemini)
```bash
curl -X POST http://localhost:8000/api/process \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

## Upcoming Phases (NOT YET IMPLEMENTED)

### Phase 2: Multi-Agent LangGraph
- Install LangGraph 1.0.0, langchain-core
- Create StateGraph with 3 agents:
  1. transcript_fetcher_agent (uses existing tool)
  2. summarizer_agent (Gemini Flash)
  3. tool_extractor_agent (GPT-4o-mini for AI tools)
- Implement parallel execution (agents 2+3 run simultaneously)
- Add AI tool extraction to response

### Phase 3: Database & Checkpointing
- Setup Neon PostgreSQL (free tier)
- Install langgraph-checkpoint-postgres
- Implement LangGraph checkpointing
- Create processing history table
- Add `GET /api/history` endpoint

### Phase 4: Next.js Frontend
- Create Next.js 15 project with TypeScript
- Install shadcn/ui components
- Build landing page with URL input
- Create results page with markdown rendering
- Implement dark mode with next-themes

### Phase 5: Real-Time Features
- Add FastAPI WebSocket endpoint
- Stream agent status updates
- Implement streaming markdown display
- Add progress indicators

### Phase 6: Polish & Features
- Dark mode toggle
- Mobile responsive design
- Export formats (MD, JSON, PDF)
- Processing history (localStorage)
- Sample video presets

### Phase 7: Deployment
- Backend: Railway (FastAPI)
- Frontend: Vercel (Next.js)
- Database: Neon PostgreSQL
- Environment variables configuration

### Phase 8: Documentation
- Professional README with architecture diagram
- Demo GIF/video
- API documentation
- Local setup guide
- Deployment instructions

## Success Criteria

After all phases:
- ✅ Live demo URL working
- ✅ GitHub repo with professional README
- ✅ Multi-agent LangGraph showcased
- ✅ Modern UI with dark mode
- ✅ Real-time agent status
- ✅ Clean, commented code
- ✅ Architecture documentation
- ✅ Deployed on free tiers

## Important Commands Reference

### Backend Development
```bash
# Activate venv
source venv/bin/activate

# Install new package
pip install package_name
pip freeze > requirements.txt

# Run server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Run in background
uvicorn app.main:app --reload &
```

### Testing
```bash
# Health check
curl http://localhost:8000/health

# API docs (Swagger)
open http://localhost:8000/docs

# Test with file
curl -X POST http://localhost:8000/api/process \
  -H "Content-Type: application/json" \
  -d @test_request.json
```

## Critical Notes for Phase 2

1. **LangGraph StateGraph Pattern:**
   ```python
   from langgraph.graph import StateGraph, START, END

   graph = StateGraph(StateClass)
   graph.add_node("node_name", function)
   graph.add_edge(START, "node_name")
   graph.add_edge("node_name", END)
   app = graph.compile()
   ```

2. **Parallel Execution:**
   - Use conditional edges to route to multiple nodes
   - Both summarizer and tool_extractor run simultaneously after transcript fetching

3. **Remember to Search & Verify:**
   - Check LangGraph 1.0.0 docs before implementing
   - Verify GPT-4o-mini API usage for tool extraction
   - Search for latest best practices

## Project Goals (Portfolio)

This is a **portfolio showcase project**, optimized for:
- ✅ Technical sophistication (multi-agent orchestration)
- ✅ Visual appeal (modern Next.js UI)
- ✅ Production-ready code quality
- ✅ Professional documentation
- ✅ Live deployed demo
- ✅ Differentiation from simple summarizers

**Not optimized for:**
- ❌ Maximum simplicity
- ❌ Lowest cost
- ❌ Fastest implementation

The goal is to **impress in portfolio reviews**, not to build the simplest working solution.
