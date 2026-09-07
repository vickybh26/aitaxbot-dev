/**
 * AdminDigest — write, preview, test and send the monthly digest.
 *
 * This screen exists because the weekly digest used to send itself. On
 * 2026-09-07 a cron mailed 146 users an issue nobody had read, and the
 * problems in it were found afterwards from the founder's own copy. Every
 * control here is deliberate: nothing on this page happens on a timer.
 *
 * The flow is ordered to make the irreversible step the last one — write,
 * see it rendered, send it to yourself, and only then send to everyone. The
 * send button is Level 1 only and states the real recipient count, because
 * "Send" with no number attached is how you find out afterwards that it went
 * further than you thought.
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ModalShell from "@/components/ui/modal-shell";
import {
  Mail, Plus, Trash2, Loader2, Send, Eye, Save, AlertTriangle,
  CheckCircle2, Users, CalendarDays,
} from "lucide-react";
import {
  currentIssueId, issueLabel, emptyIssue, validateIssue, type DigestIssue,
} from "@shared/digest";

function useAuthedFetch() {
  const { getIdToken } = useAuth();
  return async (url: string, init: RequestInit = {}) => {
    const token = await getIdToken();
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
    return body;
  };
}

/** Last 12 months, newest first — the range an issue can be written for. */
function monthOptions(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    out.push(currentIssueId(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
}

export default function AdminDigest() {
  const { adminLevel } = useAuth();
  const { toast } = useToast();
  const authedFetch = useAuthedFetch();
  const queryClient = useQueryClient();

  const [issueId, setIssueId] = useState(currentIssueId());
  const [draft, setDraft] = useState<DigestIssue>(emptyIssue(currentIssueId()));
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canSend = adminLevel === 1;

  const { data: recipients } = useQuery({
    queryKey: ["/api/admin/digest/recipients"],
    queryFn: () => authedFetch("/api/admin/digest/recipients"),
    staleTime: 60_000,
  });

  const { data: issues = [] } = useQuery<DigestIssue[]>({
    queryKey: ["/api/admin/digest/issues"],
    queryFn: () => authedFetch("/api/admin/digest/issues"),
  });

  const { data: loaded, isFetching } = useQuery<DigestIssue>({
    queryKey: ["/api/admin/digest/issues", issueId],
    queryFn: () => authedFetch(`/api/admin/digest/issues/${issueId}`),
  });

  // Replace the editor contents only when a different issue loads — not on
  // every refetch, which would discard whatever is being typed.
  useEffect(() => {
    if (loaded?.id === issueId) setDraft(loaded);
  }, [loaded?.id, issueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors = validateIssue(draft);
  const alreadySent = loaded?.status === "sent";

  const save = useMutation({
    mutationFn: () => authedFetch(`/api/admin/digest/issues/${issueId}`, {
      method: "PUT", body: JSON.stringify(draft),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/digest/issues"] });
      toast({ title: "Draft saved" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const renderPreview = useMutation({
    mutationFn: () => authedFetch("/api/admin/digest/preview", {
      method: "POST", body: JSON.stringify({ ...draft, id: issueId }),
    }),
    onSuccess: (r: any) => setPreview(r.html),
    onError: (e: Error) => toast({ title: "Preview failed", description: e.message, variant: "destructive" }),
  });

  const sendTest = useMutation({
    mutationFn: () => authedFetch(`/api/admin/digest/issues/${issueId}/test`, {
      method: "POST", body: JSON.stringify(draft),
    }),
    onSuccess: (r: any) => toast({ title: "Test sent", description: `Delivered to ${r.to}` }),
    onError: (e: Error) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  const sendAll = useMutation({
    mutationFn: () => authedFetch(`/api/admin/digest/issues/${issueId}/send`, {
      method: "POST", body: JSON.stringify({ ...draft, force: alreadySent }),
    }),
    onSuccess: (r: any) => {
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/digest/issues"] });
      toast({
        title: `Sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}`,
        description: r.failed ? `${r.failed} failed — check the server log.` : "No failures.",
      });
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const busy = save.isPending || sendTest.isPending || sendAll.isPending || renderPreview.isPending;
  const setField = <K extends keyof DigestIssue>(k: K, v: DigestIssue[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const setSection = (i: number, key: "heading" | "body", v: string) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, idx) => (idx === i ? { ...s, [key]: v } : s)),
    }));

  const inputCls = "w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/20";

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <Mail className="w-6 h-6" /> Monthly digest
            </h1>
            <p className="text-sm text-ink/65 mt-1">
              Written and sent by hand. Nothing on this page sends itself.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-ink/65 bg-paper border border-rule rounded-lg px-3 py-2">
            <Users className="w-4 h-4" />
            <span className="tabular-figures font-semibold text-ink">{recipients?.count ?? "…"}</span>
            <span>eligible recipients</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* ── Editor ── */}
          <div className="space-y-4">
            <div className="bg-card border border-rule rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-xs font-semibold text-ink/65 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Issue
                </label>
                <select
                  value={issueId}
                  onChange={(e) => setIssueId(e.target.value)}
                  className="rounded-lg border border-rule bg-card px-2 py-1.5 text-sm text-ink"
                >
                  {monthOptions().map((id) => (
                    <option key={id} value={id}>{issueLabel(id)}</option>
                  ))}
                </select>
                {isFetching && <Loader2 className="w-4 h-4 animate-spin text-ink/55" />}
                {alreadySent && (
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    Sent {loaded?.sentAt?.slice(0, 10)} · {loaded?.stats?.sent ?? 0} delivered
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/65">Subject</label>
                <input className={inputCls} value={draft.subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  placeholder="What advance tax actually is, and who has to pay it" />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/65">
                  Preheader <span className="font-normal">— the grey line next to the subject in an inbox</span>
                </label>
                <input className={inputCls} value={draft.preheader || ""}
                  onChange={(e) => setField("preheader", e.target.value)}
                  placeholder="A plain-English explainer, plus the dates worth knowing." />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/65">Intro (optional)</label>
                <textarea className={`${inputCls} min-h-[70px]`} value={draft.intro || ""}
                  onChange={(e) => setField("intro", e.target.value)}
                  placeholder="One short paragraph setting up the piece." />
              </div>
            </div>

            {/* Sections — the actual writing */}
            {draft.sections.map((sec, i) => (
              <div key={i} className="bg-card border border-rule rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink/55">Section {i + 1}</span>
                  {draft.sections.length > 1 && (
                    <button type="button" title="Remove section"
                      onClick={() => setField("sections", draft.sections.filter((_, idx) => idx !== i))}
                      className="ml-auto p-1 rounded text-ink/55 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input className={inputCls} value={sec.heading}
                  onChange={(e) => setSection(i, "heading", e.target.value)}
                  placeholder="Heading" />
                <textarea className={`${inputCls} min-h-[160px] leading-relaxed`} value={sec.body}
                  onChange={(e) => setSection(i, "body", e.target.value)}
                  placeholder={"Plain text. Leave a blank line between paragraphs.\n\nNo HTML or Markdown — it is escaped on render, so a stray < can never break the email."} />
              </div>
            ))}

            <Button variant="outline" size="sm"
              onClick={() => setField("sections", [...draft.sections, { heading: "", body: "" }])}>
              <Plus className="w-4 h-4 mr-1" /> Add section
            </Button>

            <div className="bg-card border border-rule rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={draft.includeDates}
                  onChange={(e) => setField("includeDates", e.target.checked)} />
                Append the computed “dates to watch” table
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={draft.includeUsage}
                  onChange={(e) => setField("includeUsage", e.target.checked)} />
                Append each reader’s own saved results
              </label>
            </div>
          </div>

          {/* ── Actions + history ── */}
          <div className="space-y-4">
            <div className="bg-card border border-rule rounded-xl p-4 space-y-3 lg:sticky lg:top-4">
              {errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-amber-800 flex gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{e}
                    </p>
                  ))}
                </div>
              )}

              <Button className="w-full" variant="outline" disabled={busy} onClick={() => save.mutate()}>
                {save.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save draft
              </Button>

              <Button className="w-full" variant="outline" disabled={busy} onClick={() => renderPreview.mutate()}>
                {renderPreview.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Eye className="w-4 h-4 mr-1" />}
                Preview
              </Button>

              <Button className="w-full" variant="outline"
                disabled={busy || errors.length > 0} onClick={() => sendTest.mutate()}>
                {sendTest.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                Send a test to me
              </Button>

              <div className="pt-2 border-t border-rule">
                <Button
                  className="w-full bg-ink hover:bg-ink/90 text-white"
                  disabled={busy || errors.length > 0 || !canSend}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Send to all {recipients?.count ?? ""}
                </Button>
                <p className="text-[11px] text-ink/55 mt-2 leading-snug">
                  {canSend
                    ? "This cannot be undone. Send a test to yourself first."
                    : "Level 1 (Super Admin) only."}
                </p>
              </div>
            </div>

            <div className="bg-card border border-rule rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/55 mb-3">Send history</p>
              {issues.length === 0 ? (
                <p className="text-xs text-ink/55">No issues yet.</p>
              ) : (
                <ul className="space-y-2">
                  {issues.map((it) => (
                    <li key={it.id}>
                      <button type="button" onClick={() => setIssueId(it.id)}
                        className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-paper">
                        <span className="text-sm font-semibold text-ink">{issueLabel(it.id)}</span>
                        <span className="block text-[11px] text-ink/55">
                          {it.status === "sent"
                            ? <>
                                <CheckCircle2 className="w-3 h-3 inline mr-0.5 text-emerald-600" />
                                {it.stats?.sent ?? 0} delivered
                                {it.stats?.failed ? `, ${it.stats.failed} failed` : ""}
                                {it.sentAt ? ` · ${it.sentAt.slice(0, 10)}` : ""}
                              </>
                            : "Draft"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <ModalShell onClose={() => setPreview(null)} label="Digest preview">
          <div className="bg-card rounded-2xl p-4 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink">Preview — {issueLabel(issueId)}</h2>
              <Button size="sm" variant="outline" onClick={() => setPreview(null)}>Close</Button>
            </div>
            {/* srcDoc, not innerHTML: the email is a full document with its own
                styles, and it must neither inherit from nor leak into the
                admin panel's stylesheet. */}
            <iframe title="Digest preview" srcDoc={preview}
              className="w-full h-[70vh] rounded-lg border border-rule bg-white" />
          </div>
        </ModalShell>
      )}

      {confirmOpen && (
        <ModalShell onClose={() => setConfirmOpen(false)} label="Confirm send to all recipients">
          <div className="bg-card rounded-2xl p-5 w-full max-w-md space-y-3">
            <h2 className="text-lg font-bold text-ink">Send to everyone?</h2>
            <p className="text-sm text-ink">
              This sends <strong>{draft.subject}</strong> to{" "}
              <strong className="tabular-figures">{recipients?.count ?? "…"}</strong> registered users
              who have not unsubscribed.
            </p>
            {alreadySent && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                This issue was already sent on {loaded?.sentAt?.slice(0, 10)}. Sending again will
                deliver a second copy to everyone.
              </p>
            )}
            <p className="text-xs text-ink/55">Email cannot be recalled once sent.</p>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sendAll.isPending}>
                Cancel
              </Button>
              <Button className="bg-ink hover:bg-ink/90 text-white"
                onClick={() => sendAll.mutate()} disabled={sendAll.isPending}>
                {sendAll.isPending
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Sending…</>
                  : <>Send now</>}
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </AdminLayout>
  );
}
