/**
 * DocsAndAis — which statements have been through the reconciliation, and
 * what it said to fix.
 *
 * Ported from Lovable's DocsAndAis.tsx (2026-09-06), with the right-hand
 * column re-pointed at what we actually hold. Lovable lists reported-vs-
 * declared pairs ("Department shows ₹41,300 · you declared ₹28,000"); we
 * deliberately do NOT persist extracted figures from anyone's AIS — see the
 * contract at the top of server/savedResults.ts, which the privacy policy
 * depends on. What we do keep is the reconciliation's action items, so this
 * column lists those instead. Same job for the reader, no document data at
 * rest.
 *
 * The per-document status likewise comes from the summary the reconciliation
 * route already writes ("Checked AIS · 26AS · Form 16"), not from any stored
 * upload — nothing here implies we have the files, because we don't.
 */

import { Check, Upload } from "lucide-react";
import { useSavedResults, formatDay } from "./useSavedResults";
import Panel, { EmptyState, PanelAction, PanelLink } from "./Panel";

const DOCUMENTS = [
  { id: "form16", token: "Form 16", name: "Form 16", note: "Part A & B from your employer" },
  { id: "ais", token: "AIS", name: "Annual Information Statement", note: "Downloaded from the e-filing portal" },
  { id: "26as", token: "26AS", name: "Form 26AS", note: "Tax credit statement" },
] as const;

/** "Checked AIS · 26AS · Form 16" → Set{"AIS","26AS","Form 16"}. */
function checkedTokens(hint: string | undefined): Set<string> {
  if (!hint) return new Set();
  const body = hint.replace(/^Checked\s*/i, "");
  if (/your documents/i.test(body)) return new Set();
  return new Set(body.split("·").map((s) => s.trim()).filter(Boolean));
}

export default function DocsAndAis() {
  const { data: saved = [] } = useSavedResults();
  const recon = saved.find((r) => r.toolKey === "ais");

  const checked = checkedTokens(recon?.headline.hint);
  const received = DOCUMENTS.filter((d) => checked.has(d.token)).length;
  const actionItems = (recon?.details ?? []).filter((d) => d.value);
  const clean = !!recon && actionItems.length === 0;

  return (
    <Panel
      id="documents"
      title="Documents & AIS check"
      meta={
        recon
          ? `${received} of ${DOCUMENTS.length} statements checked · last run ${formatDay(recon.updatedAt)}`
          : "Not run yet"
      }
      action={
        <PanelAction href="/tools/ais-26as-form16">
          {recon ? "Open reconciliation" : "Run the check"}
        </PanelAction>
      }
    >
      {!recon ? (
        <EmptyState
          what="Upload your AIS, Form 26AS and Form 16 and the check tells you where they disagree — before the department does. The files are read in memory and never stored."
          next={<PanelLink href="/tools/ais-26as-form16">Reconcile my documents →</PanelLink>}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <ul className="space-y-2.5">
            {DOCUMENTS.map((doc) => {
              const isIn = checked.has(doc.token);
              return (
                <li
                  key={doc.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-rule bg-paper px-4 py-3"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                      isIn ? "bg-credit-wash text-credit" : "bg-secondary text-ink/50"
                    }`}
                    aria-hidden
                  >
                    {isIn ? <Check className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{doc.name}</p>
                    <p className="truncate text-xs text-ink/55">{doc.note}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink/55">
                    {isIn ? "Checked" : "Not uploaded"}
                  </span>
                </li>
              );
            })}
          </ul>

          <div>
            <p className="field-label">
              {clean ? "Verdict" : "What to resolve before filing"}
            </p>
            <p className="mt-2 font-display text-lg font-bold text-ink">
              {recon.headline.value}
            </p>
            <p className="text-xs text-ink/55">{recon.headline.label}</p>

            {clean ? (
              <div className="mt-3 rounded-2xl border border-rule bg-credit-wash px-4 py-3">
                <p className="text-xs text-ink/75">
                  Nothing came back as a mismatch on the statements you uploaded. Re-run the
                  check if you add another Form 16 or your AIS updates.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {actionItems.map((item, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-rule bg-debit-wash px-4 py-3 text-xs leading-snug text-ink/80"
                  >
                    {item.value}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3">
              <PanelLink href="/tools/ais-26as-form16">Re-run the check →</PanelLink>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
