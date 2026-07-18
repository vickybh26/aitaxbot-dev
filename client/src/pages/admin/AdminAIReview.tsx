import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { Scale, CheckCircle2, AlertTriangle, XCircle, Loader2, Send } from "lucide-react";

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
}

type FilterStatus = "all" | "pending" | "match" | "partial" | "mismatch";

const STATUS_STYLES: Record<string, { label: string; classes: string; icon: any }> = {
  pending: { label: "Pending review", classes: "bg-slate-100 text-slate-600", icon: Loader2 },
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
      return res.json() as Promise<{ total: number; pending: number; match: number; partial: number; mismatch: number }>;
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

// The public site has no AI chat page yet, so /api/ai/query never gets called
// organically — which left this review page permanently empty ("comparison not
// working"). This box lets an admin fire test questions directly: each one runs
// the full Gemini + graph shadow pipeline and logs a fresh comparison below.
function TestQuestionBox() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const ask = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="rounded-2xl border border-persian-blue-100 bg-persian-blue-50/50 p-4 mb-6">
      <p className="text-xs font-semibold text-persian-blue-700 uppercase tracking-wide mb-2">
        Ask a test question
      </p>
      <p className="text-xs text-slate-500 mb-3">
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
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-persian-blue-200 bg-white"
          data-testid="input-eval-question"
        />
        <button
          type="submit"
          disabled={ask.isPending || question.trim().length < 5}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-persian-blue-600 hover:bg-persian-blue-700 text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-50"
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
    <div className="flex-1 min-w-[110px] rounded-xl border border-slate-100 bg-white px-4 py-3">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className={`text-xs font-medium mt-0.5 ${tone}`}>{label}</p>
    </div>
  );
}

function AnswerCard({ title, text, accent }: { title: string; text: string | null; accent: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${accent}`}>{title}</p>
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
        {text || <span className="text-slate-400 italic">No answer captured</span>}
      </div>
    </div>
  );
}

function QueryRow({ item }: { item: AIQuery }) {
  const [notes, setNotes] = useState(item.notes || "");
  const grade = useGradeMutation();
  const status = item.match_status || "pending";
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 break-words">{item.question}</p>
          <p className="text-xs text-slate-400 mt-1">
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
            <AnswerCard title="Production AI analysis (shown to user)" text={item.gemini_answer} accent="text-persian-blue-600" />
            <AnswerCard title="RAG pipeline (shadow — candidate replacement)" text={item.graph_answer} accent="text-emerald-600" />
          </>
        ) : (
          <>
            <AnswerCard title="Gemini (shown to user)" text={item.gemini_answer} accent="text-persian-blue-600" />
            <AnswerCard title="Our graph agent (shadow, not shown)" text={item.graph_answer} accent="text-emerald-600" />
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note (what's different, why it matters)…"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-persian-blue-200"
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
          <Scale className="h-5 w-5 text-persian-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">AI Answer Review</h1>
        </div>
        <p className="text-sm text-slate-500">
          Two kinds of comparisons land here. <span className="font-medium text-slate-600">Production analyses</span> —
          every time a user reconciles documents or gets calculator tax advice, the same situation is re-run through
          our RAG pipeline in shadow, so you can grade whether the RAG answer is good enough to replace the ad-hoc
          Gemini analysis. <span className="font-medium text-slate-600">Test questions</span> — asked below, compared
          Gemini-vs-graph. Grade each pair: match / partial / mismatch.
        </p>
      </div>

      <TestQuestionBox />

      {stats && (
        <div className="flex gap-3 flex-wrap mb-6">
          <StatChip label="Total compared" value={stats.total} tone="text-slate-500" />
          <StatChip label="Pending" value={stats.pending} tone="text-slate-500" />
          <StatChip label="Match" value={stats.match} tone="text-emerald-600" />
          <StatChip label="Partial" value={stats.partial} tone="text-amber-600" />
          <StatChip label="Mismatch" value={stats.mismatch} tone="text-red-600" />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(["pending", "match", "partial", "mismatch", "all"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f ? "bg-persian-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            data-testid={`filter-${f}`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-persian-blue-600" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500">{(error as Error)?.message || "Failed to load"}</p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-12">
          No queries in this bucket yet — ask the AI something on the site that matches a known tax topic,
          then come back here.
        </p>
      )}

      <div className="space-y-4">
        {filtered.map((item) => (
          <QueryRow key={item.id} item={item} />
        ))}
      </div>
    </AdminLayout>
  );
}
