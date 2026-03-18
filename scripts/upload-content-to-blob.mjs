import { put } from "@vercel/blob";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const contentDir = path.join(process.cwd(), "content");

const primaryFiles = [
  "summary.md",
  "experience.md",
  "skills.md",
  "education.md",
  "projects.md",
];

const supplementalFiles = [
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

const allowedFiles = new Set([...primaryFiles, ...supplementalFiles]);

async function listMarkdownFilesRecursively(dir, relativeDir = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = await listMarkdownFilesRecursively(fullPath, relPath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relPath);
    }
  }

  return files;
}

async function uploadContentFiles() {
  const files = await listMarkdownFilesRecursively(contentDir);
  const markdownFiles = files.filter((name) => allowedFiles.has(name));

  if (markdownFiles.length === 0) {
    throw new Error("No allowed markdown files were found in ./content");
  }

  for (const name of markdownFiles.sort()) {
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
