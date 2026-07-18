/**
 * AiTaxBot RAG Service
 * Agentic Retrieval-Augmented Generation for Indian Tax Law
 *
 * Pipeline:
 *   query → entity extraction → Tax Topic Graph traversal
 *         → expanded Qdrant search → Gemini answer generation
 *         → anonymous query logging to Firestore
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { getFirestore } from "./firebase";
import taxTopicGraph from "./taxTopicGraph.json";

// ─── Clients ────────────────────────────────────────────────────────────────

// Both embedding and generation use direct REST to avoid @google/genai SDK
// version compatibility issues. The v1beta endpoint works for all current models.

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "https://your-cluster.qdrant.io",
  apiKey: process.env.QDRANT_API_KEY || "",
});

const COLLECTION = process.env.QDRANT_COLLECTION || "aitaxbot-knowledge";
const EMBEDDING_MODEL = "gemini-embedding-001";  // 3072 dims
const GENERATION_MODEL = "gemini-3.5-flash";     // current stable flagship (June 2026)
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBED_URL = `${GEMINI_BASE}/${EMBEDDING_MODEL}:embedContent`;
const GENERATE_URL = `${GEMINI_BASE}/${GENERATION_MODEL}:generateContent`;
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
  /**
   * "graph"  — answered directly from the Tax Topic Graph's key_facts,
   *            zero Gemini/Qdrant calls made.
   * "rag"    — went through the full embed → Qdrant search → Gemini
   *            generation pipeline (novel question or needs personalised
   *            computation).
   */
  answered_by: "graph" | "rag";
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
// Word-boundary match instead of plain substring — short keywords like "PT"
// (Professional Tax) or "GST" would otherwise false-positive inside
// unrelated words (e.g. "PT" matches inside "exem-PT-ion"). This mattered
// less when Gemini smoothed over noisy extra context, but the deterministic
// graph-answer path below has no LLM to filter out a wrong match, so
// precision here now directly affects what gets shown to the user.
function extractConcepts(query: string): Set<string> {
  const found = new Set<string>();

  for (const [conceptId, node] of Object.entries(nodes)) {
    for (const keyword of node.keywords) {
      const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\b${escaped}\\b`, "i");
      if (pattern.test(query)) {
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
// Uses direct REST (v1beta) — the @google/genai SDK resolves to v1 for embedContent
// which returns 404 for text-embedding-004. Direct REST is version-stable.

async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const resp = await fetch(`${EMBED_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Gemini embed HTTP ${resp.status}: ${JSON.stringify(err)}`);
  }

  const data = await resp.json();
  const values: number[] | undefined = data?.embedding?.values;
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

// ─── Deterministic (graph-only) answer path ─────────────────────────────────
//
// This is the "own agent" layer: the Tax Topic Graph's key_facts were
// hand-built and verified against ICAI material + ITA 2025, so for the ~30
// topics it covers, composing an answer straight from those facts is more
// reliable, instant, and free than a Gemini call — and it's ours, not a
// vendor's. Gemini/Qdrant stay in the loop only as a fallback for questions
// that miss the graph entirely, or that need real number-crunching against
// the user's own figures (which a canned template can't safely answer).

// Signals that the question wants personalised computation rather than a
// generic factual answer (specific rupee figures, "calculate", "my case",
// etc.) — these skip the template path and go to the LLM fallback instead,
// since giving a fixed key_facts answer to a numeric question risks being
// wrong for that user's specific numbers.
const COMPUTATION_SIGNAL =
  /\d{3,}|lakh|crore|calculat|comput|how much (tax|will|do|should)|my (salary|income|case|situation)|for me\b|in my case/i;

function isComputationalQuestion(question: string): boolean {
  return COMPUTATION_SIGNAL.test(question);
}

interface DeterministicAnswer {
  answer: string;
  sources: Array<{ document: string; page?: number }>;
}

/**
 * Build an answer directly from the Tax Topic Graph — no network calls.
 * Returns null if none of the directly-matched concepts have key_facts
 * (some graph entries, e.g. "stt"/"grandfathering", are trigger-only stubs
 * with no facts of their own), in which case the caller should fall back
 * to the full RAG/Gemini pipeline.
 */
function composeDeterministicAnswer(
  directConcepts: Set<string>,
  expandedConcepts: Set<string>
): DeterministicAnswer | null {
  const primary = [...directConcepts].filter(id => (nodes[id]?.key_facts?.length ?? 0) > 0);
  if (primary.length === 0) return null;

  const sections: string[] = [];
  const citedSources: Array<{ document: string; page?: number }> = [];

  for (const id of primary) {
    const node = nodes[id];
    const sectionRefs = [
      ...(node.sections_ita2025 || []).map(s => `ITA 2025: ${s}`),
      ...(node.sections_ita1961 || []).map(s => `ITA 1961: ${s}`),
    ];
    const refString = sectionRefs.length ? ` (${sectionRefs.join(", ")})` : "";
    const facts = (node.key_facts || []).map(f => `- ${f}`).join("\n");
    sections.push(`**${node.label}**${refString}\n${facts}`);
    if (sectionRefs.length) {
      citedSources.push({ document: `${node.label} — ${sectionRefs.join("; ")}` });
    }
  }

  // Point at related (triggered but not directly asked-about) concepts by
  // name only — keeps the answer focused instead of dumping the whole
  // expanded graph.
  const related = [...expandedConcepts]
    .filter(id => !primary.includes(id) && nodes[id]?.label)
    .map(id => nodes[id].label)
    .slice(0, 5);

  let answer = sections.join("\n\n");
  if (related.length > 0) {
    answer += `\n\nRelated topics worth checking: ${related.join(", ")}.`;
  }

  return { answer, sources: citedSources };
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
  const apiKey = process.env.GOOGLE_API_KEY || "";

  // Direct REST call — same pattern as embedText, avoids @google/genai SDK
  // version compatibility issues. v1beta endpoint works for all current models.
  const resp = await fetch(`${GENERATE_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(`Gemini generate HTTP ${resp.status}: ${JSON.stringify(errBody)}`);
  }

  const data = await resp.json();
  const answer = (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I could not generate an answer. Please try rephrasing your question."
  ).trim();

  // Simple confidence heuristic based on chunk scores
  const avgScore = chunks.reduce((sum, c) => sum + c.score, 0) / (chunks.length || 1);
  const confidence: "high" | "medium" | "low" =
    avgScore > 0.82 ? "high" : avgScore > 0.70 ? "medium" : "low";

  return { answer, confidence };
}

// ─── Evaluation mode ─────────────────────────────────────────────────────────
//
// We're not confident enough yet in the graph-only answers to let them reach
// users directly, so for now Gemini's answer is ALWAYS what gets shown/
// returned, and the graph answer (when available) is computed silently in
// parallel purely for admin-level comparison. Every query with a graph
// answer gets logged with both texts side by side in Firestore so an admin
// can grade match/partial/mismatch (see /admin/queries + /admin/queries/:id/grade
// in ragRoutes.ts). Once enough graded comparisons show the graph path is
// "up to the mark," flip this to false to let it skip Gemini/Qdrant entirely
// for eligible queries again (the original cost/latency-saving behaviour).
const RAG_SHADOW_EVAL_MODE = true;

// ─── Query + shadow-comparison logging ───────────────────────────────────────

async function logComparison(
  question: string,
  concepts: string[],
  sessionId: string | undefined,
  source: string | undefined,
  answeredBy: "graph" | "rag",
  geminiAnswer: string | null,
  graphAnswer: string | null
): Promise<void> {
  try {
    const graphAvailable = graphAnswer !== null;
    await getFirestore().collection("ai_queries").add({
      question,                    // The query text (no user PII stored)
      concepts_triggered: concepts,
      session_id: sessionId || null,
      source: source || "unknown",
      answered_by: answeredBy,     // which answer the user actually received
      gemini_answer: geminiAnswer, // null only when the graph path served the user directly (non-eval mode)
      graph_answer: graphAnswer,   // null when no graph concept matched
      graph_available: graphAvailable,
      match_status: graphAvailable ? "pending" : null, // admin grades this once both answers exist
      timestamp: new Date().toISOString(),
      // No user ID, email, or identifying information
    });
  } catch (err) {
    // Non-fatal — log failure doesn't break the response
    console.error("[RAG] Comparison log failed:", err);
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

  // Step 2.5: Compute the graph-only answer whenever eligible (direct topic
  // match, not a personalised/computational question). In shadow-eval mode
  // this is NOT returned to the caller — it's only logged for comparison.
  const graphEligible = initialConcepts.size > 0 && !isComputationalQuestion(question);
  const graphAnswer = graphEligible ? composeDeterministicAnswer(initialConcepts, allConcepts) : null;

  if (!RAG_SHADOW_EVAL_MODE && graphAnswer) {
    // Production fast-path (not currently active): serve the graph answer
    // directly, zero Gemini/Qdrant calls.
    logComparison(question, [...allConcepts], sessionId, source, "graph", null, graphAnswer.answer);
    return {
      answer: graphAnswer.answer,
      sources: graphAnswer.sources,
      concepts_triggered: [...allConcepts],
      confidence: "high",
      disclaimer: TAX_DISCLAIMER,
      answered_by: "graph",
    };
  }

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
    const fallbackAnswer =
      "I couldn't find relevant information in my knowledge base for this question. " +
      "Please try rephrasing, or consult a Chartered Accountant for personalised advice.";
    logComparison(question, [...allConcepts], sessionId, source, "rag", fallbackAnswer, graphAnswer?.answer ?? null);
    return {
      answer: fallbackAnswer,
      sources: [],
      concepts_triggered: [...allConcepts],
      confidence: "low",
      disclaimer: TAX_DISCLAIMER,
      answered_by: "rag",
    };
  }

  // Step 6: Generate answer (timeout: 25s)
  const { answer, confidence } = await withTimeout(
    generateAnswer(question, chunks, allConcepts),
    TIMEOUT_GENERATE_MS,
    "Gemini generation"
  );

  // Step 7: Log both answers side by side for admin comparison (fire and forget)
  logComparison(question, [...allConcepts], sessionId, source, "rag", answer, graphAnswer?.answer ?? null);

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
    answered_by: "rag",
  };
}

// ─── Production-analysis shadow comparison ───────────────────────────────────
// The site's real, production Gemini usage is not a chat page — it's the
// ad-hoc analysis prompts inside the reconciliation tool (generateAIInsights)
// and the calculator's tax-advice endpoint (geminiTaxService.getTaxAdvice).
// The long-term plan is to replace those ad-hoc prompts with this RAG
// pipeline (graph + Qdrant-grounded generation). This function is the
// evidence-gathering step: every time production Gemini analysis is shown to
// a user, run the SAME situation through the RAG pipeline in shadow and log
// both answers side by side in ai_queries for admin grading on /admin/ai-review.
//
// Fire-and-forget: callers must NOT await this on the user's request path.
// Failures are swallowed — a shadow-eval error must never break the tool.
//
// Cost note: each call spends one Gemini embed + one Gemini generate + one
// Qdrant search on top of the production call. Volume today is low (a few
// reconciliations/advice requests per day); revisit if usage grows 100×.

export async function runProductionShadowComparison(opts: {
  question: string;          // synthesized, PII-free description of the taxpayer situation
  productionAnswer: string;  // the ad-hoc Gemini analysis actually shown to the user
  source: string;            // e.g. "reconcile-insights", "calculator-advice"
}): Promise<void> {
  const { question, productionAnswer, source } = opts;
  try {
    const initialConcepts = extractConcepts(question);
    const allConcepts = expandConceptGraph(initialConcepts);

    const expandedQuery = buildExpandedQuery(question, allConcepts);
    const queryVector = await withTimeout(embedText(expandedQuery), TIMEOUT_EMBED_MS, "Gemini embedding");
    const chunks = await withTimeout(searchQdrant(queryVector, [...allConcepts]), TIMEOUT_SEARCH_MS, "Qdrant search");

    let ragAnswer: string;
    if (chunks.length === 0) {
      ragAnswer = "[RAG pipeline found no relevant knowledge-base chunks for this situation]";
    } else {
      const generated = await withTimeout(generateAnswer(question, chunks, allConcepts), TIMEOUT_GENERATE_MS, "Gemini generation");
      ragAnswer = generated.answer;
    }

    await getFirestore().collection("ai_queries").add({
      question,
      concepts_triggered: [...allConcepts],
      session_id: null,
      source,
      comparison_type: "production_vs_rag", // distinguishes these rows from chat-style gemini-vs-graph rows
      answered_by: "production",            // the user saw the ad-hoc production analysis
      gemini_answer: productionAnswer,      // what the user actually saw
      graph_answer: ragAnswer,              // the RAG pipeline's candidate replacement
      graph_available: true,                // ensures it appears in the /admin/ai-review list
      match_status: "pending",
      timestamp: new Date().toISOString(),
      // No user ID, email, PAN, or identifying information — question is a
      // synthesized summary of figures only.
    });
  } catch (err) {
    console.warn(`[RAG] Production shadow comparison failed (${source}) — non-fatal:`, err instanceof Error ? err.message : err);
  }
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
      vectorCount = (info as any).points_count ?? (info as any).vectors_count ?? 0;
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
