# LectureFlow

**AI-Powered YouTube Lecture Notes Generator with Multi-Agent Orchestration**

Transform any YouTube educational video into comprehensive, structured lecture notes with AI-extracted tools—all in real-time.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-teal?logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.0.0-purple)](https://github.com/langchain-ai/langgraph)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?logo=postgresql)](https://neon.tech/)

---

## Features

### Core Capabilities
- **Real-Time Streaming**: ChatGPT-style SSE streaming shows progress as notes generate
- **Multi-Agent Orchestration**: LangGraph coordinates 3 specialized agents running in parallel
- **Smart Caching**: 99% cost reduction on repeat videos (7-day PostgreSQL cache)
- **AI Tool Extraction**: Automatically identifies and catalogues AI tools mentioned in videos
- **PDF Export**: Download professional PDFs with markdown-formatted notes
- **Processing History**: Full history with search, pagination, and detailed result views

### User Experience
- **Dark Mode**: System-aware theme with animated toggle
- **Preset Videos**: 7 curated educational videos for instant demos
- **Horizontal Scrolling**: Touch-optimized card carousels
- **Cross-Browser**: Safari 16.4+, Chrome 120+, Firefox 128+, Edge 120+
- **Mobile-Responsive**: Optimized layouts for all screen sizes
- **Accessible**: WCAG-compliant typography and keyboard navigation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User (YouTube URL)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          Frontend (Next.js 15 + React 19 + Tailwind v4)     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - EventSource SSE streaming                          │   │
│  │  - Server Components for history pages                │   │
│  │  - Magic UI animations (beams, cards, theme toggle)   │   │
│  │  - react-markdown with @tailwindcss/typography        │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ GET /api/process/stream
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (FastAPI 0.115 + LangGraph)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Smart Cache Check (PostgreSQL)                       │   │
│  │  ├─ CACHE HIT  → Stream from DB (instant)            │   │
│  │  └─ CACHE MISS → Multi-Agent Orchestration           │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            LangGraph Multi-Agent StateGraph                  │
│                                                              │
│    Agent 1: Transcript Extractor                            │
│         │                                                    │
│         ├──────────┬──────────┐                             │
│         ▼          ▼          ▼                             │
│    Agent 2:    Agent 3:                                     │
│    Notes Gen   Tool Extract                                 │
│    (Gemini)    (GPT-4o-mini)                                │
│    [PARALLEL]  [PARALLEL]                                   │
│         │          │                                         │
│         └──────────┴──────────┐                             │
│                                ▼                             │
│                        Merge Results                         │
│                                │                             │
│                                ▼                             │
│                    Save to PostgreSQL                        │
│                                │                             │
│                                ▼                             │
│                      Stream to Frontend                      │
└─────────────────────────────────────────────────────────────┘
```

**Technology Stack:**
- **Frontend:** Next.js 15.5.6, React 19, Tailwind CSS v4, shadcn/ui, Magic UI
- **Backend:** FastAPI 0.115, LangGraph 1.0, SQLAlchemy 2.0 (async)
- **AI/LLM:** Gemini 2.5 Flash (notes), GPT-4o-mini (tool extraction)
- **Database:** PostgreSQL (Neon), Alembic migrations
- **Deployment Ready:** Vercel (frontend), Railway (backend)

---

## Quick Start

### Prerequisites
- **Python:** 3.11+ (backend)
- **Node.js:** 18+ (frontend)
- **PostgreSQL:** Neon account (free tier) or local PostgreSQL
- **API Keys:**
  - `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) - [Get it here](https://aistudio.google.com/app/apikey)
  - `OPENAI_API_KEY` - [Get it here](https://platform.openai.com/api-keys)

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your API keys and DATABASE_URL

# 5. Run database migrations
alembic upgrade head

# 6. Start the server
uvicorn app.main:app --reload --port 8000
```

Backend will be available at **http://localhost:8000**

API docs (Swagger): **http://localhost:8000/docs**

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Frontend will be available at **http://localhost:3000**

---

## Usage

### Processing a Video

1. **Enter YouTube URL** in the input field on the home page
2. **Click "Generate Notes"** or try a preset video
3. **Watch real-time streaming** as:
   - Video metadata appears
   - Transcript is fetched
   - Notes generate chunk-by-chunk
   - AI tools are extracted
4. **Export to PDF** or save to history

### Exploring History

- Navigate to **History** page via top-right icon
- Search, sort, and filter past processing results
- Click any result to view full details
- Delete unwanted entries

### Forcing Reprocessing

If a video was cached, you'll see a **"Force Reprocess"** button to bypass the cache and regenerate notes fresh.

---

## API Endpoints

### Core Processing
- `GET /api/process/stream?video_url={url}&force={bool}` - SSE streaming endpoint
  - **Parameters:**
    - `video_url` (required): YouTube video URL
    - `force` (optional): Bypass cache (default: false)
  - **Events:** `metadata`, `transcript`, `notes_chunk`, `tools`, `complete`, `error`

### History Management
- `GET /api/history?page={int}&page_size={int}&search={str}` - Paginated history list
- `GET /api/history/{result_id}` - Single result details
- `DELETE /api/history/{result_id}` - Delete processing result

### Presets & Export
- `GET /api/presets` - List of 7 curated demo videos
- `POST /api/export-pdf` - Generate and download PDF
  - **Body:** `{ video_id, title, notes, tools }`

### Health Check
- `GET /health` - API health status
- `GET /` - API information

---

## Environment Variables

### Backend (.env)
```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql+asyncpg://user:pass@host/db

# Optional
ENVIRONMENT=development
LOG_LEVEL=INFO
```

---

## Key Features Explained

### 1. Smart Caching System
- **Cache Duration:** 7 days
- **Storage:** PostgreSQL (no Redis needed)
- **Cache Key:** Video ID
- **Behavior:**
  - First request: Process via APIs → Save to DB → Stream results
  - Subsequent requests: Stream from DB instantly
  - **Cost Impact:** 99% reduction on API costs for repeat videos

### 2. Multi-Agent Orchestration
- **Agent 1 (Transcript Extractor):**
  - Fetches YouTube transcript via youtube-transcript-api
  - Handles multiple languages, auto-generated captions
  - Returns structured transcript data

- **Agent 2 (Notes Generator):**
  - Uses Gemini 2.5 Flash for summarization
  - Generates markdown-formatted lecture notes
  - Follows ChatGPT-style voice and structure

- **Agent 3 (Tool Extractor):**
  - Uses GPT-4o-mini to identify AI tools mentioned
  - Returns structured JSON with tool names, URLs, descriptions
  - Runs in parallel with Agent 2 for efficiency

### 3. Real-Time SSE Streaming
- **Server-Sent Events** for unidirectional server-to-client streaming
- **Automatic reconnection** on connection loss
- **Progressive rendering** of markdown as chunks arrive
- **Loading states** with skeleton components and pulsing animations

### 4. Cross-Browser Compatibility
- **Safari Optimizations:**
  - 25 BackgroundBeams (vs 50 on Chrome) for performance
  - Zero initial animation delay for instant visual feedback
  - `-webkit-` prefixes for backdrop-filter and transform
  - GPU acceleration via `translateZ(0)`

- **Browser Support Matrix:**
  - Safari 16.4+, Chrome 120+, Firefox 128+, Edge 120+
  - Requires modern CSS: @property, color-mix(), OKLCH colors
  - Tailwind CSS v4 with @plugin directive

---

## Development

### Running Tests

```bash
# Backend tests (if implemented)
cd backend
pytest

# Frontend tests (if implemented)
cd frontend
npm test
```

### Database Migrations

```bash
# Create a new migration
cd backend
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1
```

### Code Quality

```bash
# Backend linting (if ruff/black configured)
cd backend
ruff check .
black .

# Frontend linting
cd frontend
npm run lint
```

---

## Performance

- **Fresh Processing:** 10-20 seconds (varies by video length)
- **Cached Processing:** <1 second (instant streaming from DB)
- **Cost Savings:** 99% reduction on repeat videos
- **Browser Performance:**
  - Chrome/Firefox: 50 animated beams
  - Safari: 25 animated beams (50% reduction for smooth 60fps)

---

## Known Limitations

- **Video Length:** Works best with videos <2 hours (transcript API limits)
- **Languages:** Primarily English transcripts (multi-language support via youtube-transcript-api)
- **Browser Requirements:** Safari 16.4+, Chrome 120+ (Tailwind v4 CSS features)
- **Rate Limits:** Dependent on Gemini/OpenAI API quotas

---

## Contributing

Contributions are welcome! Improvements, bug fixes, and feature suggestions are appreciated.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Acknowledgments

- **LangGraph** for multi-agent orchestration framework
- **shadcn/ui** for beautiful, accessible UI components
- **Magic UI** for animated components (beams, cards, theme toggle)
- **Tailwind CSS** for utility-first styling
- **Next.js** and **React** teams for modern web framework
- **FastAPI** for blazing-fast Python API framework
- **Neon** for serverless PostgreSQL
