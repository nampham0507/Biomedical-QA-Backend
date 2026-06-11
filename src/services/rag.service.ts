import path from "path";
import fs from "fs";
import logger from "../utils/logger";
import { ISource } from "../models/Conversation.model";

const VECTOR_STORE_PATH = path.join(__dirname, "../../vector_store");

// ── In-memory document store ───────────────────────────────────
interface DocEntry {
  id: string;
  content: string;
  title: string;
  dataset: string;
  embedding?: number[];
}

let documentStore: DocEntry[] = [];
let isInitialized = false;

// ── Cosine similarity ──────────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB + 1e-10);
}

// ── TF-IDF embedding (fallback) ────────────────────────────────
function tfidfEmbed(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const freqMap: Record<string, number> = {};
  words.forEach((w) => {
    freqMap[w] = (freqMap[w] || 0) + 1;
  });

  const vector = new Array(512).fill(0);
  Object.entries(freqMap).forEach(([word, freq]) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % 512;
    }
    vector[Math.abs(hash)] += freq / words.length;
  });
  return vector;
}

async function embedText(text: string): Promise<number[]> {
  return tfidfEmbed(text);
}

// ── Load vector store ──────────────────────────────────────────
export async function initVectorStore(): Promise<void> {
  const storePath = path.join(VECTOR_STORE_PATH, "documents.json");
  if (fs.existsSync(storePath)) {
    try {
      documentStore = JSON.parse(fs.readFileSync(storePath, "utf-8"));
      logger.info(`Vector store loaded: ${documentStore.length} documents`);
    } catch {
      logger.warn("Could not parse vector store — starting empty");
    }
  }
  isInitialized = true;
}

function saveVectorStore(): void {
  if (!fs.existsSync(VECTOR_STORE_PATH)) {
    fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
  }
  fs.writeFileSync(
    path.join(VECTOR_STORE_PATH, "documents.json"),
    JSON.stringify(documentStore, null, 2),
  );
}

// ── Chunk text ─────────────────────────────────────────────────
function chunkText(text: string, size = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(" ");
    if (chunk.trim().length > 20) chunks.push(chunk);
    if (i + size >= words.length) break;
  }
  return chunks;
}

// ── Index documents ────────────────────────────────────────────
export async function indexDocuments(
  docs: Array<{ title: string; content: string; dataset: string }>,
): Promise<number> {
  const { v4: uuidv4 } = await import("uuid");
  let count = 0;

  for (const doc of docs) {
    const chunks = chunkText(doc.content);
    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      documentStore.push({
        id: uuidv4(),
        content: chunk,
        title: doc.title,
        dataset: doc.dataset,
        embedding,
      });
      count++;
    }
  }

  saveVectorStore();
  logger.info(`Indexed ${count} chunks`);
  return count;
}

// ── Similarity search ──────────────────────────────────────────
async function similaritySearch(
  query: string,
  topK = 5,
): Promise<Array<DocEntry & { score: number }>> {
  if (documentStore.length === 0) return [];

  const queryEmbedding = await embedText(query);

  return documentStore
    .filter((d) => d.embedding)
    .map((d) => ({
      ...d,
      score: cosineSimilarity(queryEmbedding, d.embedding!),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ── Call OpenRouter API ────────────────────────────────────────
async function callOpenRouter(
  question: string,
  context: string,
): Promise<{ answer: string; tokensUsed: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";

  if (!apiKey) {
    return { answer: generateDemoAnswer(question, context), tokensUsed: 0 };
  }

  const systemPrompt = `You are a highly knowledgeable biomedical AI assistant.
Answer questions accurately based on the provided biomedical literature context.
Always cite your sources by referencing [Source N] in your answer.
If the context is insufficient, clearly state the limitations.
Use clear, professional medical language.`;

  const userPrompt = context
    ? `Context from biomedical literature:\n\n${context}\n\n---\n\nQuestion: ${question}\n\nProvide a comprehensive, evidence-based answer:`
    : `Question: ${question}\n\nNote: No specific literature context available. Provide a general evidence-based answer and note this limitation:`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
          "X-Title": "BioMedQA",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`OpenRouter error ${response.status}: ${errText}`);
      return { answer: generateDemoAnswer(question, context), tokensUsed: 0 };
    }

    const data: any = await response.json();
    const answer =
      data.choices?.[0]?.message?.content || "Unable to generate answer.";
    const tokensUsed = data.usage?.total_tokens || 0;

    return { answer, tokensUsed };
  } catch (err: any) {
    logger.error("OpenRouter fetch error:", err.message);
    return { answer: generateDemoAnswer(question, context), tokensUsed: 0 };
  }
}

// ── Demo answer fallback ───────────────────────────────────────
function generateDemoAnswer(question: string, context: string): string {
  const hasContext = context.length > 0;
  return `**Demo Mode** — Configure OPENROUTER_API_KEY for real AI responses.

Question: *"${question}"*

${
  hasContext
    ? `Found ${context.split("---").length} relevant document(s) in the knowledge base. In production, these would generate a precise cited answer.`
    : "No documents found in the vector store. Upload biomedical datasets via Admin → Datasets first."
}

**To enable full functionality:**
1. Ensure \`OPENROUTER_API_KEY\` is set in your \`.env\`
2. Upload biomedical datasets via Admin panel
3. The system will auto-index and create vector embeddings`;
}

// ── Main QA function ───────────────────────────────────────────
export interface QAResult {
  answer: string;
  sources: ISource[];
  tokensUsed: number;
  processingTime: number;
}

export async function answerBiomedicalQuestion(
  question: string,
): Promise<QAResult> {
  const startTime = Date.now();

  if (!isInitialized) await initVectorStore();

  const retrievedDocs = await similaritySearch(question, 5);

  const context =
    retrievedDocs.length > 0
      ? retrievedDocs
          .map((d, i) => `[Source ${i + 1}] ${d.title}\n${d.content}`)
          .join("\n\n---\n\n")
      : "";

  const { answer, tokensUsed } = await callOpenRouter(question, context);

  const sources: ISource[] = retrievedDocs.map((d) => ({
    title: d.title,
    content: d.content.slice(0, 300) + (d.content.length > 300 ? "..." : ""),
    score: Math.round(d.score * 100) / 100,
    dataset: d.dataset,
  }));

  return {
    answer,
    sources,
    tokensUsed,
    processingTime: Date.now() - startTime,
  };
}

// ── Utilities ──────────────────────────────────────────────────
export function clearVectorStore(): void {
  documentStore = [];
  saveVectorStore();
}

export function getDocumentCount(): number {
  return documentStore.length;
}
