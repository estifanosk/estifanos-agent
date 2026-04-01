# Estifanos Agent

A personal AI assistant that answers questions about Estifanos Kidane's professional experience, skills, and background.

**Live:** [estifanosk.dev](https://estifanosk.dev)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS
- **LLM:** OpenAI GPT-4o
- **Rate Limiting:** Upstash Redis
- **Hosting:** Vercel
- **Resume Content Storage:** Vercel Blob (private)

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/estifanosk/estifanos-agent.git
cd estifanos-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` with required environment variables:
```bash
OPENAI_API_KEY=sk-...
BLOB_READ_WRITE_TOKEN=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
estifanos-agent/
├── .env.example             # Example environment variable template
├── README.md                # Setup and deployment documentation
├── LICENSE                  # MIT license
├── app/
│   ├── api/chat/route.ts    # Chat API route (OpenAI + rate limiting)
│   ├── page.tsx             # Chat UI
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Styles
├── content/                 # Local resume markdown (fallback for local dev, ignored by git)
│   ├── summary.md
│   ├── experience.md
│   ├── skills.md
│   ├── education.md
│   └── projects.md
├── lib/
│   ├── resume.ts            # Loads context from private Blob first, local markdown fallback second
│   └── rate-limit.ts        # Upstash Redis rate limiting
├── scripts/
│   └── upload-content-to-blob.mjs  # Uploads local markdown files to private Blob
├── DESIGN.md                # Product/design notes
├── TESTING.md               # Prompt-injection test results
└── next.config.ts           # Next.js configuration
```

## Updating Resume Content

Edit local files in `/content/`, then upload to private Blob:

```bash
npm run upload:content
```

The app retrieves context from private Blob at runtime, so no Git commit is required for content updates.

## Security

The agent has been tested against common prompt injection attacks. See [TESTING.md](TESTING.md) for details.

**Summary:** All 6 attack types tested (instruction override, system prompt extraction, DAN jailbreak, persona manipulation, personal info extraction, context extraction) were successfully blocked.

### Admin Questions Page

- URL: `/admin`
- Access: login form at `/admin/login` using `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- Data: user questions are logged from chat requests and grouped by UTC date
- Storage: Upstash Redis (same Redis integration used for rate limiting)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables:
   - `OPENAI_API_KEY`
4. Add Upstash Redis integration for rate limiting
5. Configure domain (estifanosk.dev)

## Cost Estimate

| Service | Monthly Cost |
|---------|--------------|
| Vercel Hosting | $0 (Hobby) |
| Upstash Redis | $0 (Free tier) |
| OpenAI API | ~$3-5 |
| **Total** | **~$3-5/month** |

Based on ~5 employers/day, ~10 messages each.

## License

MIT
