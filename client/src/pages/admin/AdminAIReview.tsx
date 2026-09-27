import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { Scale, CheckCircle2, AlertTriangle, XCircle, Loader2, Send, Sparkles } from "lucide-react";

interface AIQuery {
  id: string;
  question: string;
  concepts_triggered: string[];
  answered_by: "graph" | "rag" | "production";
  gemini_answer: string | null;
  graph_answer: string | null;
  graph_available: boolean;
  match_status: "pending" | "match" | "partial" | "mismatch" | null;
  notes?: string | null;
  timestamp: string;
  source?: string;
  // "production_vs_rag" rows come from the reconcile tool / calculator advice:
  // gemini_answer = the ad-hoc production analysis the user saw,
  // graph_answer = the RAG pipeline's shadow answer (candidate replacement).
  comparison_type?: "production_vs_rag";
  auto_review?: {
    match_status: "match" | "partial" | "mismatch";
    confidence: "low" | "medium" | "high";
    scores: { equivalence: number; completeness: number; context_fit: number; safety: number };
    rationale: string;
    material_differences: string[];
    tax_correctness_verified: false;
    human_review_required: true;
    evaluated_at: string;
  };
}

type FilterStatus = "all" | "pending" | "match" | "partial" | "mismatch";

const STATUS_STYLES: Record<string, { label: string; classes: string; icon: any }> = {
  pending: { label: "Pending review", classes: "bg-secondary text-ink/65", icon: Loader2 },
  match: { label: "Match", classes: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  partial: { label: "Partial", classes: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  mismatch: { label: "Mismatch", classes: "bg-red-100 text-red-700", icon: XCircle },
};

function useEvalStats() {
  const { getIdToken } = useAuth();
  return useQuery({
    queryKey: ["/api/ai/admin/eval-stats"],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch("/api/ai/admin/eval-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load eval stats");
      return res.json() as Promise<{
        total: number; pending: number; match: number; partial: number; mismatch: number;
        autoReviewed: number; autoComparedCount: number; autoAgreementCount: number;
        autoAgreementRate: number; evaluatorEnabled: boolean;
      }>;
    },
    staleTime: 30_000,
  });
}

function useQueries() {
  const { getIdToken } = useAuth();
  return useQuery({
    queryKey: ["/api/ai/admin/queries", "graph_available"],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch("/api/ai/admin/queries?graph_available=true&limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load queries");
      const body = await res.json();
      return body.queries as AIQuery[];
    },
    staleTime: 15_000,
  });
}

function useGradeMutation() {
  const { getIdToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, match_status, notes }: { id: string; match_status: string; notes?: string }) => {
      const token = await getIdToken();
      const res = await fetch(`/api/ai/admin/queries/${id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ match_status, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || body?.error || "Failed to save grade");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/admin/queries", "graph_available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/admin/eval-stats"] });
    },
  });
}

function useAutoGradeMutation() {
  const { getIdToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getIdToken();
      const res = await fetch(`/api/ai/admin/queries/${id}/auto-grade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || body?.error || "Automatic rating failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/admin/queries", "graph_available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/admin/eval-stats"] });
    },
  });
}

// The public site has no AI chat page yet, so /api/ai/query never gets called
// organically — which left this review page permanently empty ("comparison not
// working"). This box lets an admin fire test questions directly: each one runs
// the full Gemini + graph shadow pipeline and logs a fresh comparison below.
function TestQuestionBox() {
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();
  const [question, setQuestion] = useState("");
  const ask = useMutation({
    mutationFn: async (q: string) => {
      const token = await getIdToken();
      const res = await fetch("/api/ai/admin/test-query", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q, source: "admin-eval" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "AI query failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setQuestion("");
      // The comparison row is written fire-and-forget server-side; give
      // Firestore a beat before refetching so the new row actually appears.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/ai/admin/queries", "graph_available"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ai/admin/eval-stats"] });
      }, 1500);
    },
  });

  return (
    <div className="rounded-2xl border border-rule bg-paper/50 p-4 mb-6">
      <p className="text-xs font-semibold text-ink uppercase tracking-wide mb-2">
        Ask a test question
      </p>
      <p className="text-xs text-ink/65 mb-3">
        Runs the full AI pipeline (Gemini answer + graph shadow answer) and logs the comparison below for grading.
        Try questions on known topics — HRA, 80C, capital gains, advance tax.
      </p>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim().length >= 5 && !ask.isPending) ask.mutate(question.trim());
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How is HRA exemption calculated?"
          className="flex-1 rounded-lg border border-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rule bg-card"
          data-testid="input-eval-question"
        />
        <button
          type="submit"
          disabled={ask.isPending || question.trim().length < 5}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink hover:bg-ink text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-50"
          data-testid="button-eval-ask"
        >
          {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {ask.isPending ? "Running…" : "Ask"}
        </button>
      </form>
      {ask.isError && (
        <p className="text-xs text-red-500 mt-2">{(ask.error as Error).message}</p>
      )}
      {ask.isSuccess && !ask.isPending && (
        <p className="text-xs text-emerald-600 mt-2">
          Answer generated — the comparison will appear in the Pending list in a moment.
          {!(ask.data as any)?.concepts_triggered?.length && " (Note: no graph concepts matched this question, so it won't appear in the graph-comparison list — try a more standard tax topic.)"}
        </p>
      )}
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex-1 min-w-[110px] rounded-xl border border-rule bg-card px-4 py-3">
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className={`text-xs font-medium mt-0.5 ${tone}`}>{label}</p>
    </div>
  );
}

function AnswerCard({ title, text, accent }: { title: string; text: string | null; accent: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${accent}`}>{title}</p>
      <div className="rounded-lg border border-rule bg-secondary p-3 text-sm text-ink/80 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
        {text || <span className="text-ink/65 italic">No answer captured</span>}
      </div>
    </div>
  );
}

function QueryRow({ item, evaluatorEnabled }: { item: AIQuery; evaluatorEnabled: boolean }) {
  const [notes, setNotes] = useState(item.notes || "");
  const grade = useGradeMutation();
  const autoGrade = useAutoGradeMutation();
  const status = item.match_status || "pending";
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <div className="rounded-2xl border border-rule bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink break-words">{item.question}</p>
          <p className="text-xs text-ink/65 mt-1">
            {new Date(item.timestamp).toLocaleString("en-IN")} · concepts: {item.concepts_triggered.join(", ") || "none"}
            {item.source ? ` · source: ${item.source}` : ""}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.classes}`}>
          {statusStyle.label}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-3">
        {item.comparison_type === "production_vs_rag" ? (
          <>
            <AnswerCard title="Production AI analysis (shown to user)" text={item.gemini_answer} accent="text-ink" />
            <AnswerCard title="RAG pipeline (shadow — candidate replacement)" text={item.graph_answer} accent="text-emerald-600" />
          </>
        ) : (
          <>
            <AnswerCard title="Gemini (shown to user)" text={item.gemini_answer} accent="text-ink" />
            <AnswerCard title="Our graph agent (shadow, not shown)" text={item.graph_answer} accent="text-emerald-600" />
          </>
        )}
      </div>

      <section className="mb-3 rounded-xl border border-rule bg-secondary/60 p-3" aria-label="Automatic rating suggestion">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">AI rating suggestion</p>
            <p className="mt-0.5 text-xs leading-5 text-ink/65">
              Rubric-based comparison only—not a tax-law fact check. The suggestion never replaces your rating.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Send this question and answer pair to Gemini for an on-demand rating? Do not evaluate taxpayer-identifying details.")) {
                autoGrade.mutate(item.id);
              }
            }}
            disabled={!evaluatorEnabled || autoGrade.isPending || (item.source !== "admin-eval" && item.comparison_type !== "production_vs_rag")}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-rule bg-card px-3 py-2 text-xs font-semibold text-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
            title={!evaluatorEnabled ? "Enable AI_ANSWER_EVALUATOR_ENABLED after confirming paid Gemini API service terms" : undefined}
            data-testid={`auto-grade-${item.id}`}
          >
            {autoGrade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {autoGrade.isPending ? "Rating…" : item.auto_review ? "Rate again" : "Rate with AI"}
          </button>
        </div>

        {!evaluatorEnabled && (
          <p className="mt-2 text-xs text-ink/65">Disabled until the operator confirms a billing-enabled Gemini API project and enables the evaluator.</p>
        )}
        {autoGrade.isError && <p role="alert" className="mt-2 text-xs text-debit">{(autoGrade.error as Error).message}</p>}
        {item.auto_review && (
          <div className="mt-3 border-t border-rule pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold capitalize text-ink">
                Suggested: {item.auto_review.match_status}
              </span>
              <span className="text-xs text-ink/65">{item.auto_review.confidence} confidence</span>
              <span className="text-xs text-ink/65">· reviewed {new Date(item.auto_review.evaluated_at).toLocaleString("en-IN")}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-ink/80">{item.auto_review.rationale}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/65">
              <span>Answer alignment {item.auto_review.scores.equivalence}/5</span>
              <span>Completeness {item.auto_review.scores.completeness}/5</span>
              <span>Year/jurisdiction fit {item.auto_review.scores.context_fit}/5</span>
              <span>Safety {item.auto_review.scores.safety}/5</span>
            </div>
            {item.auto_review.material_differences.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-ink/70">
                {item.auto_review.material_differences.map((difference, index) => <li key={index}>{difference}</li>)}
              </ul>
            )}
            <p className="mt-2 text-xs font-medium text-notice">Not independently verified against tax law or source documents. Human review required.</p>
          </div>
        )}
      </section>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note (what's different, why it matters)…"
          className="flex-1 rounded-lg border border-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rule"
        />
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => grade.mutate({ id: item.id, match_status: "match", notes })}
            disabled={grade.isPending}
            className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-2 transition-colors disabled:opacity-50"
            data-testid={`grade-match-${item.id}`}
          >
            Match
          </button>
          <button
            onClick={() => grade.mutate({ id: item.id, match_status: "partial", notes })}
            disabled={grade.isPending}
            className="rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-2 transition-colors disabled:opacity-50"
            data-testid={`grade-partial-${item.id}`}
          >
            Partial
          </button>
          <button
            onClick={() => grade.mutate({ id: item.id, match_status: "mismatch", notes })}
            disabled={grade.isPending}
            className="rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3 py-2 transition-colors disabled:opacity-50"
            data-testid={`grade-mismatch-${item.id}`}
          >
            Mismatch
          </button>
        </div>
      </div>
      {grade.isError && (
        <p className="text-xs text-red-500 mt-2">{(grade.error as Error).message}</p>
      )}
    </div>
  );
}

export default function AdminAIReview() {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const { data: stats } = useEvalStats();
  const { data: queries, isLoading, isError, error } = useQueries();

  const filtered = (queries || []).filter((q) => {
    if (filter === "all") return true;
    return (q.match_status || "pending") === filter;
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Scale className="h-5 w-5 text-ink" />
          <h1 className="text-xl font-bold text-ink">AI Answer Review</h1>
        </div>
        <p className="text-sm text-ink/65">
          Two kinds of comparisons land here. <span className="font-medium text-ink/65">Production analyses</span> —
          every time a user reconciles documents or gets calculator tax advice, the same situation is re-run through
          our RAG pipeline in shadow, so you can grade whether the RAG answer is good enough to replace the ad-hoc
          Gemini analysis. <span className="font-medium text-ink/65">Test questions</span> — asked below, compared
          Gemini-vs-graph. Grade each pair: match / partial / mismatch.
        </p>
      </div>

      <TestQuestionBox />

      {stats && (
        <div className="flex gap-3 flex-wrap mb-6">
          <StatChip label="Total compared" value={stats.total} tone="text-ink/65" />
          <StatChip label="Pending" value={stats.pending} tone="text-ink/65" />
          <StatChip label="Match" value={stats.match} tone="text-emerald-600" />
          <StatChip label="Partial" value={stats.partial} tone="text-amber-600" />
          <StatChip label="Mismatch" value={stats.mismatch} tone="text-red-600" />
          <StatChip label="AI suggestions" value={stats.autoReviewed} tone="text-ink/65" />
          <StatChip label="AI / human agreement" value={stats.autoAgreementRate} tone="text-ink/65" />
        </div>
      )}

      {stats && stats.autoComparedCount > 0 && (
        <p className="-mt-4 mb-5 text-xs text-ink/65">
          Agreement is {stats.autoAgreementCount} of {stats.autoComparedCount} comparisons with a human grade. It is a calibration signal, not a measure of tax correctness.
        </p>
      )}

      <div className="flex gap-2 mb-4">
        {(["pending", "match", "partial", "mismatch", "all"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f ? "bg-ink text-white" : "bg-secondary text-ink/65 hover:bg-secondary"
            }`}
            data-testid={`filter-${f}`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500">{(error as Error)?.message || "Failed to load"}</p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-ink/65 text-center py-12">
          No queries in this bucket yet — ask the AI something on the site that matches a known tax topic,
          then come back here.
        </p>
      )}

      <div className="space-y-4">
        {filtered.map((item) => (
          <QueryRow key={item.id} item={item} evaluatorEnabled={stats?.evaluatorEnabled ?? false} />
        ))}
      </div>
    </AdminLayout>
  );
}
