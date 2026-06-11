import fs from "fs";
import path from "path";
import logger from "../utils/logger";

export interface ParsedDocument {
  title: string;
  content: string;
  dataset: string;
}

export async function processUploadedFile(
  filePath: string,
  originalName: string,
  datasetName: string,
): Promise<ParsedDocument[]> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return parsePDF(filePath, originalName, datasetName);
    case ".txt":
      return parseTXT(filePath, originalName, datasetName);
    case ".json":
      return parseJSON(filePath, datasetName);
    case ".csv":
      return parseCSV(filePath, datasetName);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function parsePDF(
  filePath: string,
  originalName: string,
  dataset: string,
): Promise<ParsedDocument[]> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const pages = data.text
      .split("\f")
      .filter((p: string) => p.trim().length > 50);

    return pages.map((page: string, i: number) => ({
      title: `${originalName} — Page ${i + 1}`,
      content: page.trim(),
      dataset,
    }));
  } catch (err) {
    logger.error("PDF parse error:", err);
    throw new Error("Failed to parse PDF");
  }
}

function parseTXT(
  filePath: string,
  originalName: string,
  dataset: string,
): ParsedDocument[] {
  const text = fs.readFileSync(filePath, "utf-8");
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 50);

  return paragraphs.map((para, i) => ({
    title: `${originalName} — Section ${i + 1}`,
    content: para.trim(),
    dataset,
  }));
}

function parseJSON(filePath: string, dataset: string): ParsedDocument[] {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const items: any[] = Array.isArray(raw)
      ? raw
      : raw.data || raw.items || [raw];

    return items
      .filter(
        (item) => item.question || item.text || item.content || item.abstract,
      )
      .map((item, i) => ({
        title:
          item.title ||
          item.question?.slice(0, 80) ||
          `${dataset} — Entry ${i + 1}`,
        content: [
          item.question,
          item.answer || item.long_answer || item.ideal_answer,
          item.abstract || item.text || item.content,
          item.context,
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 2000),
        dataset,
      }));
  } catch (err) {
    logger.error("JSON parse error:", err);
    throw new Error("Failed to parse JSON");
  }
}

function parseCSV(filePath: string, dataset: string): ParsedDocument[] {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  const docs: ParsedDocument[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    if (values.length !== headers.length) continue;

    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx];
    });

    const content = Object.entries(record)
      .filter(([, v]) => v && v.length > 5)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    if (content.length > 20) {
      docs.push({
        title: record["title"] || record["question"] || `${dataset} — Row ${i}`,
        content,
        dataset,
      });
    }
  }

  return docs;
}
