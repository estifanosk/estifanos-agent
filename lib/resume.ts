import fs from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";

const contentDir = path.join(process.cwd(), "content");
const primaryResumeFiles = [
  "summary.md",
  "experience.md",
  "skills.md",
  "education.md",
  "projects.md",
];

const supplementalResumeFiles = [
  "products/2002-2005 court systems technical skills research.md",
  "products/azure api for fhir service capabilities.md",
  "products/azure blockchain service research.md",
  "products/capitalone card backoffice system.md",
  "products/microsoft_advertising_editor_summary.md",
  "products/sap_concur_overview.md",
  "background/azure-blockchain-background.md",
  "background/capital-one-background.md",
  "background/ethiopia-early-career-background.md",
  "background/expedia-virtual-agent-background.md",
  "background/microsoft-bing-ads-background.md",
  "background/sap-concur-background.md",
];

const resumeFiles = [...primaryResumeFiles, ...supplementalResumeFiles];

const personalProjectsContext = `## Personal Projects

### Genzeb
Genzeb is a local-first desktop expense tracker. It imports bank and credit-card statements, links receipts, categorizes transactions, and stores data as plain CSV files on the user's machine. The project explores local-first product design, append-only/auditable data modeling, Electron, React, TypeScript, receipt workflows, and optional AI/MCP integrations.
Repository: https://github.com/estifanosk/genzeb

### AlgoLens
AlgoLens is a visual coding interview companion. It teaches algorithm patterns through short explanations, structural visuals, step-by-step walkthroughs, guided hints, explain-it-back practice, and reference-code flows. The project explores educational product design, algorithm visualization, static Next.js delivery, React, TypeScript, and Tailwind CSS.
Repository: https://github.com/estifanosk/algolens

### Interactive Profile
Interactive Profile is this AI-backed career profile. It answers questions about Estifanos's professional experience using curated resume context, OpenAI, Vercel Blob, rate limiting, and a focused chat UI. The project explores grounded professional Q&A, prompt design, deployment, and visitor question logging.
Repository: https://github.com/estifanosk/interactive-profile

### HardHat
HardHat is a QR-based construction compliance prototype. It explores worker certification checks, equipment readiness, daily inspection workflows, Job Hazard Analysis sign-off, and compliance dashboards. The project uses Next.js and product workflow modeling to explore a job-site safety/compliance problem.
Repository: https://github.com/estifanosk/hardhat`;

async function readLocalMarkdownFile(filename: string): Promise<string> {
  const filePath = path.join(contentDir, filename);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

async function readBlobMarkdownFile(filename: string): Promise<string> {
  try {
    const result = await get(`content/${filename}`, {
      access: "private",
      useCache: false,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return "";
    }

    return await new Response(result.stream).text();
  } catch {
    return "";
  }
}

async function readMarkdownFile(filename: string): Promise<string> {
  const blobContent = await readBlobMarkdownFile(filename);
  if (blobContent) {
    return blobContent;
  }

  return readLocalMarkdownFile(filename);
}

export async function getResumeContext(): Promise<string> {
  const sections = await Promise.all(resumeFiles.map((filename) => readMarkdownFile(filename)));
  return [...sections, personalProjectsContext].join("\n\n").trim();
}

export async function getSystemPrompt(): Promise<string> {
  const resumeContext = await getResumeContext();

  return `You are an AI assistant for Estifanos Kidane's professional portfolio. Answer questions about his professional background, skills, projects, and experience based on the resume data below.

Guidelines:
- Speak about Estifanos in third person, not as Estifanos
- Be specific, grounded, professional, and concise
- Do not oversell, exaggerate, or invent details
- Stay on topic (professional/career related questions)
- If asked something not covered in the resume, politely say you don't have that information
- Be useful to potential employers, collaborators, and people reviewing his work
- Keep responses focused and relevant
- Treat summary/experience/skills/education/projects as primary truth; use product/background notes as supporting detail

---
RESUME DATA:
${resumeContext}
---`;
}
