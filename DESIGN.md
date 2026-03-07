# Estif Agent - Design Specification

## Overview

A minimal chat interface that allows visitors to ask questions about Estifanos Kidane's professional experience. The agent responds using an LLM with resume context injected via system prompt.

**Live URL:** estifanos.dev

---

## Goals

- Answer employer questions about work experience, skills, and background
- Clean, fast, mobile-friendly chat UI
- Minimal infrastructure and maintenance overhead
- Quick to deploy and iterate

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 Next.js App                       │
│                                                   │
│  ┌─────────────┐         ┌─────────────────────┐ │
│  │  Chat UI    │ ──────▶ │  /api/chat          │ │
│  │  (React)    │ ◀────── │  (API Route)        │ │
│  └─────────────┘         └─────────────────────┘ │
│                                   │              │
└───────────────────────────────────│──────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              ┌─────────────────┐     ┌─────────────────┐
              │   Claude API    │     │   Vercel KV     │
              │   (Anthropic)   │     │   (Redis)       │
              └─────────────────┘     └─────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack, easy deployment |
| Styling | Tailwind CSS | Rapid UI development |
| LLM | Claude API (Anthropic) | High quality responses |
| Rate Limiting | Vercel KV (Redis) | Persistent, ~$1/month |
| Hosting | Vercel | Zero-config Next.js hosting |
| Domain | estifanos.dev | Professional, full name |

---

## Core Components

### 1. Chat Interface (`/app/page.tsx`)

- Message list with user/assistant bubbles
- Input field with send button
- Auto-scroll to latest message
- Loading state during response generation
- Mobile-responsive layout

### 2. API Route (`/app/api/chat/route.ts`)

- Accepts POST with `{ messages: Message[] }`
- Checks rate limit before processing
- Prepends system prompt with resume context
- Calls Claude API with streaming
- Returns streamed response

### 3. Rate Limiter (`/lib/rate-limit.ts`)

- Uses Vercel KV (Redis) for distributed state
- Tracks requests by IP address
- Sliding window algorithm
- Config: 20 requests per minute per IP
- Returns 429 Too Many Requests when exceeded

### 4. Resume Context (`/lib/resume.ts`)

Structured data containing:
- Professional summary
- Work experience (company, role, dates, highlights)
- Technical skills
- Education
- Notable projects
- Contact preferences

---

## Data Models

```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: Message[]
}

interface ResumeData {
  name: string
  title: string
  summary: string
  experience: Experience[]
  skills: string[]
  education: Education[]
  projects: Project[]
}
```

---

## System Prompt Structure

```
You are an AI assistant representing Estifanos Kidane. Answer questions
about his professional background, skills, and experience based on the
resume data below. Be conversational, professional, and concise.

Guidelines:
- First person when speaking as Estifanos ("I worked at...", "My experience...")
- Stay on topic (professional/career related)
- If asked something not in the resume, say you don't have that information
- Be helpful to potential employers

---
RESUME DATA:
{structured resume content}
---
```

---

## API Design

### POST /api/chat

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What's your experience with Python?" }
  ]
}
```

**Response:** Server-sent events (streaming)
```
data: {"content": "I have"}
data: {"content": " extensive"}
data: {"content": " experience..."}
data: [DONE]
```

---

## UI Wireframe

```
┌────────────────────────────────────────┐
│  estifanos.dev                    [?]  │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 👋 Hi! I'm Estifanos's AI       │  │
│  │ assistant. Ask me about his     │  │
│  │ experience, skills, or work.    │  │
│  └──────────────────────────────────┘  │
│                                        │
│         ┌────────────────────────┐     │
│         │ What tech stack do you │     │
│         │ use most often?        │     │
│         └────────────────────────┘     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ I primarily work with...        │  │
│  └──────────────────────────────────┘  │
│                                        │
├────────────────────────────────────────┤
│ [  Ask me anything...          ] [➤]   │
└────────────────────────────────────────┘
```

---

## File Structure

```
estif-agent/
├── app/
│   ├── page.tsx           # Chat UI
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Tailwind + custom styles
│   └── api/
│       └── chat/
│           └── route.ts   # Chat API endpoint
├── components/
│   ├── ChatMessage.tsx    # Message bubble component
│   ├── ChatInput.tsx      # Input field component
│   └── ChatContainer.tsx  # Main chat wrapper
├── lib/
│   ├── resume.ts          # Resume data
│   ├── anthropic.ts       # Claude API client
│   └── rate-limit.ts      # Vercel KV rate limiter
├── public/
│   └── favicon.ico
├── .env.local             # ANTHROPIC_API_KEY
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...

# Vercel KV (auto-populated when linked in Vercel dashboard)
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

---

## Security Considerations

- **Rate limiting:** Vercel KV (Redis) - 20 requests/minute per IP
  - Prevents API abuse and Claude credit burn
  - Persists across serverless function instances
  - Returns 429 with retry-after header when exceeded
- Input sanitization: Handled by React
- API key: Server-side only, never exposed to client
- No user data storage: Stateless, privacy-friendly

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First contentful paint | < 1s |
| Time to interactive | < 2s |
| Response start (streaming) | < 500ms |
| Mobile Lighthouse score | > 90 |

---

## Cost Estimate

**Assumptions:**
- 5 employers/day
- ~10 messages each
- ~50 messages/day (~1,500/month)

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Vercel Hosting | Hobby (Free) | $0 |
| Vercel KV | Free tier (3k req/day) | $0 |
| Claude API (Sonnet) | Pay-as-you-go | ~$3-5 |
| **Total** | | **~$3-5/month** |

*Claude API based on ~1.5M tokens/month. Use Haiku (~$0.50/month) for lower cost.*

---

## Future Enhancements (Out of Scope for V1)

- Voice input/output
- Resume PDF download
- Analytics dashboard
- Multiple language support
- Conversation history persistence

---

## Development Phases

### Phase 1: Core Implementation
- Set up Next.js project
- Build chat UI components
- Implement API route with Claude
- Add resume context

### Phase 2: Polish
- Styling and animations
- Error handling
- Loading states
- Mobile optimization

### Phase 3: Deploy
- Configure Vercel
- Set up domain (estifanos.dev)
- Test production build

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "@vercel/kv": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0"
  }
}
```
