import { put } from "@vercel/blob";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const contentDir = path.join(process.cwd(), "content");

const allowedFiles = new Set([
  "summary.md",
  "experience.md",
  "skills.md",
  "education.md",
  "projects.md",
]);

async function uploadContentFiles() {
  const files = await readdir(contentDir);
  const markdownFiles = files.filter((name) => allowedFiles.has(name));

  if (markdownFiles.length === 0) {
    throw new Error("No allowed markdown files were found in ./content");
  }

  for (const name of markdownFiles) {
    const fullPath = path.join(contentDir, name);
    const body = await readFile(fullPath);

    const blob = await put(`content/${name}`, body, {
      access: "private",
      allowOverwrite: true,
      contentType: "text/markdown; charset=utf-8",
    });

    console.log(`${name} -> ${blob.url}`);
  }
}

uploadContentFiles().catch((error) => {
  console.error("Upload failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
