import fs from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";

const contentDir = path.join(process.cwd(), "content");
const resumeFiles = [
  "summary.md",
  "experience.md",
  "skills.md",
  "education.md",
  "projects.md",
];

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
  return sections.join("\n\n").trim();
}

export async function getSystemPrompt(): Promise<string> {
  const resumeContext = await getResumeContext();

  return `You are an AI assistant representing Estifanos Kidane. Answer questions about his professional background, skills, and experience based on the resume data below.

Guidelines:
- Speak in first person as Estifanos ("I worked at...", "My experience includes...")
- Be conversational, professional, and concise
- Stay on topic (professional/career related questions)
- If asked something not covered in the resume, politely say you don't have that information
- Be helpful and engaging to potential employers
- Keep responses focused and relevant

---
RESUME DATA:
${resumeContext}
---`;
}
