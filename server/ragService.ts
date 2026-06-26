/**
 * AiTaxBot RAG Service
 * Agentic Retrieval-Augmented Generation for Indian Tax Law
 *
 * Pipeline:
 *   query → entity extraction → Tax Topic Graph traversal
 *         → expanded Qdrant search → Gemini answer generation
 *         → anonymous query logging to Firestore
 */

import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { getFirestore } from "./firebase";
import taxTopicGraph from "./taxTopicGraph.json";

// ─── Clients ────────────────────────────────────────────────────────────────

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "https://your-cluster.qdrant.io",
  apiKey: process.env.QDRANT_API_KEY || "",
});

const COLLECTION = process.env.QDRANT_COLLECTION || "aitaxbot-knowledge";
const EMBEDDING_MODEL = "text-embedding-004";   // 768 dims — free tier
const GENERATION_MODEL = "gemini-2.5-flash";
const TOP_K = 8;                                 // chunks returned per search
const MAX_CONTEXT_CHARS = 12000;                 // keep prompt < 16K tokens

// ─── Timeout budgets ─────────────────────────────────────────────────────────
const TIMEOUT_EMBED_MS      = 10_000;   // Gemini embedding  — 10s
const TIMEOUT_SEARCH_MS     =  8_000;   // Qdrant search     —  8s
const TIMEOUT_GENERATE_MS   = 25_000;   // Gemini generation — 25s
const TIMEOUT_PIPELINE_MS   = 35_000;   // Total pipeline    — 35s (hard ceiling)

/**
 * Race a promise against a timeout.
 * Throws a labelled error if the timeout fires first — avoids infinite hangs
 * when Gemini or Qdrant is slow / unresponsive.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`[RAG] ${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RAGQuery {
  question: string;
  sessionId?: string;       // anonymous browser session (no PII)
  source?: string;          // e.g. "calculator_page", "blog", "api"
}

export interface RAGChunk {
  text: string;
  source: string;
  source_type: string;
  page?: number;
  score: number;
}

export interface RAGResult {
  answer: string;
  sources: Array<{ document: string; page?: number }>;
  concepts_triggered: string[];
  confidence: "high" | "medium" | "low";
  disclaimer: string;
}

// ─── Tax Topic Graph helpers ─────────────────────────────────────────────────

type GraphNode = {
  label: string;
  keywords: string[];
  triggers?: string[];
  sections_ita2025?: string[];
  sections_ita1961?: string[];
  key_facts?: string[];
};

const nodes: Record<string, GraphNode> = (taxTopicGraph as any).nodes;

/**
 * Extract tax concepts from a query by keyword matching.
 * Returns a set of concept IDs from the Tax Topic Graph.
 */
function extractConcepts(query: string): Set<string> {
  const q = query.toLowerCase();
  const found = new Set<string>();

  for (const [conceptId, node] of Object.entries(nodes)) {
    for (const keyword of node.keywords) {
      if (q.includes(keyword.toLowerCase())) {
        found.add(conceptId);
        break;
      }
    }
  }
  return found;
}

/**
 * Traverse the Tax Topic Graph to expand the initial concept set.
 * BFS up to depth 2 — catches all directly triggered dependencies.
 */
function expandConceptGraph(initial: Set<string>): Set<string> {
  const expanded = new Set(initial);
  const queue = [...initial];

  let depth = 0;
  while (queue.length > 0 && depth < 2) {
    const current = queue.shift()!;
    const node = nodes[current];
    if (!node?.triggers) continue;

    for (const triggered of node.triggers) {
      if (!expanded.has(triggered)) {
        expanded.add(triggered);
        queue.push(triggered);
      }
    }
    depth++;
  }

  return expanded;
}

/**
 * Build a rich search query from the original question + triggered concepts.
 * This expands narrow questions ("what is 80C limit?") into comprehensive
 * queries that also pull regime choice, NPS, and related deduction context.
 */
function buildExpandedQuery(original: string, concepts: Set<string>): string {
  const conceptLabels = [...concepts]
    .map(id => nodes[id]?.label)
    .filter(Boolean)
    .join(", ");

  const keyFacts = [...concepts]
    .flatMap(id => nodes[id]?.key_facts || [])
    .slice(0, 5)
    .join("; ");

  return `${original}\n\nRelated tax concepts: ${conceptLabels}.\nKey context: ${keyFacts}`;
}

// ─── Embedding ───────────────────────────────────────────────────────────────

async function embedText(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });

  const values = result.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Embedding returned empty vector");
  }
  return values;
}

// ─── Qdrant search ───────────────────────────────────────────────────────────

async function searchQdrant(
  vector: number[],
  conceptFilter?: string[]
): Promise<RAGChunk[]> {
  const searchParams: any = {
    vector,
    limit: TOP_K,
    with_payload: true,
  };

  // Optionally filter by concept tags stored in payload
  if (conceptFilter && conceptFilter.length > 0) {
    searchParams.filter = {
      should: conceptFilter.map(concept => ({
        key: "concepts",
        match: { value: concept },
      })),
    };
  }

  const results = await qdrant.search(COLLECTION, searchParams);

  return results.map(r => ({
    text: String(r.payload?.text || ""),
    source: String(r.payload?.source || "Unknown"),
    source_type: String(r.payload?.source_type || ""),
    page: r.payload?.page as number | undefined,
    score: r.score,
  }));
}

// ─── Answer generation ───────────────────────────────────────────────────────

function buildPrompt(
  question: string,
  chunks: RAGChunk[],
  concepts: Set<string>
): string {
  // Truncate context to stay within token limits
  let context = "";
  for (const chunk of chunks) {
    const addition = `\n\n[Source: ${chunk.source}${chunk.page ? `, p.${chunk.page}` : ""}]\n${chunk.text}`;
    if ((context + addition).length > MAX_CONTEXT_CHARS) break;
    context += addition;
  }

  // Include key facts from triggered graph nodes as supplementary context
  const graphFacts = [...concepts]
    .flatMap(id => {
      const node = nodes[id];
      if (!node) return [];
      const sections = [
        ...(node.sections_ita2025 || []).map(s => `ITA 2025: ${s}`),
        ...(node.sections_ita1961 || []).map(s => `ITA 1961: ${s}`),
      ].join(", ");
      return node.key_facts?.map(f => `• ${node.label} (${sections}): ${f}`) || [];
    })
    .join("\n");

  return `You are an expert Indian tax advisor for AiTaxBot. Answer the user's question using ONLY the provided legal excerpts and verified facts below.

LEGAL EXCERPTS FROM OFFICIAL DOCUMENTS:
${context}

VERIFIED KEY FACTS FROM TAX TOPIC GRAPH:
${graphFacts || "No additional key facts."}

USER QUESTION: ${question}

INSTRUCTIONS:
1. Answer directly and specifically — no vague generalisations.
2. Always cite the specific section/rule (e.g., "Section 80C, ITA 1961" or "Section 123, ITA 2025") when stating a rule.
3. If ITA 2025 and ITA 1961 sections differ, mention both (ITA 2025 is current law; ITA 1961 sections are referenced by many users).
4. Use ₹ symbol and Indian number formatting (lakhs, crores).
5. If the answer depends on Old vs New Regime, state both clearly.
6. If you are uncertain or the documents don't cover the question, say so explicitly — do not fabricate.
7. End with one actionable next step the user can take.
8. Keep the answer under 400 words unless the question is complex.

ANSWER:`;
}

async function generateAnswer(
  question: string,
  chunks: RAGChunk[],
  concepts: Set<string>
): Promise<{ answer: string; confidence: "high" | "medium" | "low" }> {
  const prompt = buildPrompt(question, chunks, concepts);

  const response = await ai.models.generateContent({
    model: GENERATION_MODEL,
    contents: prompt,
  });

  const answer = response.text?.trim() || "I could not generate an answer. Please try rephrasing your question.";

  // Simple confidence heuristic based on chunk scores
  const avgScore = chunks.reduce((sum, c) => sum + c.score, 0) / (chunks.length || 1);
  const confidence: "high" | "medium" | "low" =
    avgScore > 0.82 ? "high" : avgScore > 0.70 ? "medium" : "low";

  return { answer, confidence };
}

// ─── Query logging ───────────────────────────────────────────────────────────

async function logQuery(
  question: string,
  concepts: string[],
  sessionId?: string,
  source?: string
): Promise<void> {
  try {
    await getFirestore().collection("ai_queries").add({
      question,                    // The query text (no user PII stored)
      concepts_triggered: concepts,
      session_id: sessionId || null,
      source: source || "unknown",
      timestamp: new Date().toISOString(),
      // No user ID, email, or identifying information
    });
  } catch (err) {
    // Non-fatal — log failure doesn't break the response
    console.error("[RAG] Query log failed:", err);
  }
}

// ─── Main RAG pipeline ───────────────────────────────────────────────────────

export async function runRAGQuery(input: RAGQuery): Promise<RAGResult> {
  const { question, sessionId, source } = input;

  if (!question?.trim()) {
    throw new Error("Question is required");
  }

  // Step 1: Extract concepts from query
  const initialConcepts = extractConcepts(question);

  // Step 2: Expand via Tax Topic Graph (BFS depth 2)
  const allConcepts = expandConceptGraph(initialConcepts);

  // Step 3: Build expanded query for better semantic search
  const expandedQuery = buildExpandedQuery(question, allConcepts);

  // Step 4: Embed the expanded query (timeout: 10s)
  const queryVector = await withTimeout(
    embedText(expandedQuery),
    TIMEOUT_EMBED_MS,
    "Gemini embedding"
  );

  // Step 5: Search Qdrant (timeout: 8s)
  const chunks = await withTimeout(
    searchQdrant(queryVector, [...allConcepts]),
    TIMEOUT_SEARCH_MS,
    "Qdrant search"
  );

  if (chunks.length === 0) {
    return {
      answer:
        "I couldn't find relevant information in my knowledge base for this question. " +
        "Please try rephrasing, or consult a Chartered Accountant for personalised advice.",
      sources: [],
      concepts_triggered: [...allConcepts],
      confidence: "low",
      disclaimer: TAX_DISCLAIMER,
    };
  }

  // Step 6: Generate answer (timeout: 25s)
  const { answer, confidence } = await withTimeout(
    generateAnswer(question, chunks, allConcepts),
    TIMEOUT_GENERATE_MS,
    "Gemini generation"
  );

  // Step 7: Log anonymously (fire and forget)
  logQuery(question, [...allConcepts], sessionId, source);

  // Step 8: Deduplicate sources
  const seen = new Set<string>();
  const sources = chunks
    .map(c => ({ document: c.source, page: c.page }))
    .filter(s => {
      const key = `${s.document}:${s.page}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);

  return {
    answer,
    sources,
    concepts_triggered: [...allConcepts],
    confidence,
    disclaimer: TAX_DISCLAIMER,
  };
}

// ─── Health check ────────────────────────────────────────────────────────────

export async function checkRAGHealth(): Promise<{
  qdrant: boolean;
  collection_exists: boolean;
  vector_count: number;
  gemini: boolean;
}> {
  let qdrantOk = false;
  let collectionExists = false;
  let vectorCount = 0;
  let geminiOk = false;

  try {
    const collections = await qdrant.getCollections();
    qdrantOk = true;
    collectionExists = collections.collections.some(c => c.name === COLLECTION);
    if (collectionExists) {
      const info = await qdrant.getCollection(COLLECTION);
      vectorCount = info.vectors_count ?? 0;
    }
  } catch (_) {
    // Qdrant not reachable
  }

  try {
    await embedText("test");
    geminiOk = true;
  } catch (_) {
    // Gemini not reachable
  }

  return { qdrant: qdrantOk, collection_exists: collectionExists, vector_count: vectorCount, gemini: geminiOk };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TAX_DISCLAIMER =
  "This answer is for general informational purposes only and does not constitute professional tax advice. " +
  "Tax laws change frequently. Always verify with the latest CBDT notifications or consult a qualified " +
  "Chartered Accountant before filing your return or making tax decisions.";
