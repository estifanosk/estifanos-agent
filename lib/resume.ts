import fs from "fs";
import path from "path";

const contentDir = path.join(process.cwd(), "content");

function readMarkdownFile(filename: string): string {
  const filePath = path.join(contentDir, filename);
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function getResumeContext(): string {
  const summary = readMarkdownFile("summary.md");
  const experience = readMarkdownFile("experience.md");
  const skills = readMarkdownFile("skills.md");
  const education = readMarkdownFile("education.md");
  const projects = readMarkdownFile("projects.md");

  return `
${summary}

${experience}

${skills}

${education}

${projects}
`.trim();
}

export function getSystemPrompt(): string {
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
${getResumeContext()}
---`;
}
