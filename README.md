# Estifanos Agent

A personal AI assistant that answers questions about Estifanos Kidane's professional experience, skills, and background.

**Live:** [estifanosk.dev](https://estifanosk.dev)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **LLM:** OpenAI GPT-4o
- **Rate Limiting:** Upstash Redis
- **Hosting:** Vercel

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/estifanos/estifanos-agent.git
cd estifanos-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` with your API key:
```bash
OPENAI_API_KEY=sk-...
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
estifanos-agent/
├── app/
│   ├── api/chat/route.ts    # Chat API endpoint
│   ├── page.tsx             # Chat UI
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Styles
├── content/                 # Resume data (markdown)
│   ├── summary.md
│   ├── experience.md
│   ├── skills.md
│   ├── education.md
│   └── projects.md
├── lib/
│   ├── resume.ts            # Loads content → system prompt
│   └── rate-limit.ts        # Upstash Redis rate limiting
└── DESIGN.md                # Design specification
```

## Updating Resume Content

Edit the markdown files in `/content/` and push to redeploy:

```bash
git add content/
git commit -m "Update resume content"
git push
```

Vercel will automatically rebuild and deploy.

## Security

The agent has been tested against common prompt injection attacks. See [TESTING.md](TESTING.md) for details.

**Summary:** All 6 attack types tested (instruction override, system prompt extraction, DAN jailbreak, persona manipulation, personal info extraction, context extraction) were successfully blocked.

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

Private - All rights reserved.
