/**
 * Dashboard — "your numbers first, tools last".
 *
 * Rebuilt 2026-09-06 against the layout Vicky designed in Lovable
 * (clear-tax-answers.lovable.app/dashboard, source pulled via the Lovable
 * connector): a section rail beside a column of bento panels — tax position,
 * next dates, deductions left, documents/AIS, saved results — with the tool
 * links demoted to a chip row at the bottom.
 *
 * WHAT CHANGED FROM LOVABLE'S VERSION, AND WHY
 * --------------------------------------------
 * Their dashboard renders from src/lib/dashboard/sample.ts — every figure on
 * it is invented. Ours reads the real per-user data we already hold:
 * /api/saved-results (last result per tool), shared/keyDates.ts (computed
 * statutory dates), /api/tax-calculations (explicitly saved computations) and
 * /api/tool-usage. Where their mock shows something we genuinely do not track
 * — tax already paid this year, uploaded-document dates, reported-vs-declared
 * AIS figures — the panel shows what we do have instead of a number that would
 * look authoritative and be fiction. See each panel for the specific call.
 *
 * The pieces that predate this rebuild and are kept because they are real
 * features, not decoration: the profile-completion nudge, the 30-day saved
 * computations list with its PDF export and delete, the accounting row (only
 * for users who actually have a firm), and recent tool activity.
 */

import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trackPageView } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ProfileCompletionModal from "@/components/ProfileCompletionModal";
import Panel, { EmptyState, PanelLink } from "@/components/dashboard/Panel";
import Rail from "@/components/dashboard/Rail";
import TaxPosition from "@/components/dashboard/TaxPosition";
import NextUp from "@/components/dashboard/NextUp";
import LeftToClaim from "@/components/dashboard/LeftToClaim";
import DocsAndAis from "@/components/dashboard/DocsAndAis";
import SavedResults from "@/components/dashboard/SavedResults";
import {
  AlertCircle,
  Building2,
  Calculator,
  Download,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";

/**
 * Personal dashboard stats — served by GET /api/dashboard/stats.
 *
 * This deliberately does NOT come from /api/accounting/dashboard/stats any
 * more. That endpoint belongs to the accounting module (firms → invoices →
 * clients → revenue), so every user who isn't running a CA practice saw a row
 * of zeroes, and its `taxCalculations` field counted the `taxProfiles`
 * collection — which nothing in the codebase has ever written to.
 *
 * `accounting` is null unless the user actually has firms, so the accounting
 * row is omitted rather than rendered as 0 / 0 / ₹0.
 */
interface DashboardStats {
  calculationsRun: number;
  toolsUsed: number;
  savedCalculations: number;
  savedResults: number;
  activeDays: number;
  lastActivityAt: string | null;
  accounting: {
    firmsCount: number;
    invoicesCount: number;
    clientsCount: number;
    totalRevenue: string;
    paidInvoices: number;
    unpaidInvoices: number;
  } | null;
}

interface ToolUsageEvent {
  id: string;
  tool: string;
  route: string | null;
  summary: string | null;
  createdAt: string;
}

interface TaxCalculationHistory {
  id: string;
  financialYear: string;
  assessmentYear: string;
  ageGroup: string;
  inputData: any;
  oldRegimeResult: any;
  newRegimeResult: any;
  recommendedRegime: string;
  savings: string;
  grossIncome: string;
  taxableIncomeOld: string;
  taxableIncomeNew: string;
  totalTaxOld: string;
  totalTaxNew: string;
  createdAt: string;
  expiresAt: string;
}

/** The tools this dashboard sends people back into, in the order they matter. */
const TOOLS = [
  { title: "Income Tax Calculator", to: "/calculators/income-tax" },
  { title: "AIS · 26AS · Form 16", to: "/tools/ais-26as-form16" },
  { title: "HRA Exemption", to: "/calculators/hra" },
  { title: "Rent Receipt Generator", to: "/tools/rent-receipt" },
  { title: "Trading Tax", to: "/calculators/trading-tax" },
  { title: "NPS Corpus", to: "/calculators/nps" },
  { title: "SIP Projection", to: "/calculators/sip" },
  { title: "Home Loan", to: "/calculators/home-loan" },
  { title: "Find a CA", to: "/find-ca" },
];

/**
 * The FY in progress — April (month index 3) starts a new one. Used for the
 * rail's caption only; the tax-position panel labels itself with the FY the
 * user's own calculation was actually run for, never this.
 */
function currentFinancialYear(now = new Date()): string {
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

function currentAssessmentYear(now = new Date()): string {
  const start = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { user, userProfile, isProfileComplete, getIdToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // The automatic once-per-session nudge now lives in GlobalProfilePrompt
  // (mounted once at the app root — see App.tsx) so it fires for every entry
  // point, not just visits to this page. This local state is only for the
  // manual "Complete Now" button below — a separate, user-initiated trigger
  // that doesn't conflict with the automatic global one.
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    trackPageView("/dashboard", "User Dashboard - AiTaxBot");
  }, []);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  // NOTE: the old /api/accounting/dashboard/activities query used to live here.
  // Nothing on this page ever rendered its result — it only emits invoice and
  // firm events, so it was empty for every non-accounting user — yet it fired a
  // firms→invoices→clients fan-out against Firestore on every dashboard load.
  // Recent activity is shown from /api/tool-usage below instead.
  const { data: toolUsageEvents = [] } = useQuery<ToolUsageEvent[]>({
    queryKey: ["/api/tool-usage"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const response = await fetch("/api/tool-usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: taxCalculations = [], isLoading: taxCalcLoading } = useQuery<
    TaxCalculationHistory[]
  >({
    queryKey: ["/api/tax-calculations"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const response = await fetch("/api/tax-calculations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
  });

  const deleteCalculation = async (id: string) => {
    setDeletingId(id);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/tax-calculations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast({ title: "Deleted", description: "Tax calculation removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tax-calculations"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete calculation",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const generatePDFFromHistory = (calc: TaxCalculationHistory) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const formatAmount = (amount: number | string) => {
      const num = typeof amount === "string" ? parseFloat(amount) : amount;
      return "₹" + num.toLocaleString("en-IN");
    };

    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text("AiTaxBot", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Saved Tax Calculation Report", pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(10);
    doc.text(`Financial Year: ${calc.financialYear} (AY ${calc.assessmentYear})`, pageWidth / 2, y, {
      align: "center",
    });
    y += 10;

    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("RECOMMENDATION", 20, y);
    y += 6;

    doc.setFontSize(11);
    doc.setTextColor(0);
    const regimeName = calc.recommendedRegime === "old" ? "Old Tax Regime" : "New Tax Regime";
    doc.text(`Best Option: ${regimeName}`, 20, y);
    y += 5;
    doc.text(`Potential Savings: ${formatAmount(calc.savings)}`, 20, y);
    y += 12;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("INCOME SUMMARY", 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Gross Income: ${formatAmount(calc.grossIncome)}`, 25, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("OLD REGIME", 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Taxable Income: ${formatAmount(calc.taxableIncomeOld)}`, 25, y);
    y += 5;
    doc.text(`Total Tax: ${formatAmount(calc.totalTaxOld)}`, 25, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("NEW REGIME", 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Taxable Income: ${formatAmount(calc.taxableIncomeNew)}`, 25, y);
    y += 5;
    doc.text(`Total Tax: ${formatAmount(calc.totalTaxNew)}`, 25, y);
    y += 12;

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")}`, 20, y);
    doc.text("www.aitaxbot.co.in", pageWidth - 20, y, { align: "right" });

    doc.save(`tax-calculation-fy-${calc.financialYear}.pdf`);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const getDaysUntilExpiry = (expiresAt: string) =>
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  };

  const firstName =
    userProfile?.firstName || user?.displayName?.split(" ")?.[0] || "there";
  const fullName =
    [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ") ||
    user?.displayName ||
    user?.email ||
    "Your account";

  return (
    <>
      <Helmet>
        <title>My Dashboard - AiTaxBot Personal Finance Hub</title>
        <meta
          name="description"
          content="Your tax position, upcoming dates, deductions left to claim and saved calculations in one place."
        />
        <link rel="canonical" href="https://www.aitaxbot.co.in/dashboard" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {showProfileModal && <ProfileCompletionModal onClose={() => setShowProfileModal(false)} />}

      <div className="bg-paper">
        <div className="mx-auto max-w-[1180px] px-5 py-8 lg:py-12">
          {/* ── Header ──
              The year chip is a statement of the FY in progress, not a picker:
              we hold one saved result per tool, not a set per assessment year,
              so a dropdown here would offer years with nothing behind them. */}
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-ink/70">
                <span className="h-1.5 w-1.5 rounded-full bg-credit" aria-hidden />
                FY {currentFinancialYear()} · AY {currentAssessmentYear()}
              </span>
              <h1 className="mt-4 truncate font-display text-[clamp(1.7rem,3.6vw,2.4rem)] font-extrabold tracking-tight text-ink">
                Good to see you, {firstName}.
              </h1>
            </div>
            <Link
              href="/calculators/income-tax"
              className="flex min-h-[44px] shrink-0 items-center rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-credit"
            >
              Calculate my taxes
            </Link>
          </header>

          {/* Profile completion nudge — kept from the previous dashboard. */}
          {!isProfileComplete && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-notice/30 bg-notice-wash px-4 py-3">
              <div className="flex items-center gap-2 text-ink/80">
                <AlertCircle className="h-4 w-4 shrink-0 text-notice" />
                <span className="text-sm font-medium">
                  Complete your profile to get personalised tax tips and faster support.
                </span>
              </div>
              <Button
                size="sm"
                className="min-h-[44px] shrink-0 rounded-full bg-ink text-paper hover:bg-credit"
                onClick={() => setShowProfileModal(true)}
              >
                Complete now
              </Button>
            </div>
          )}

          <div className="mt-7 lg:flex lg:gap-6">
            <Rail fullName={fullName} financialYear={currentFinancialYear()} />

            <div className="min-w-0 flex-1 space-y-5">
              <TaxPosition />

              <div className="grid gap-5 lg:grid-cols-2">
                <NextUp />
                <LeftToClaim />
              </div>

              <DocsAndAis />
              <SavedResults />

              {/* ── Saved tax computations ──
                  The explicit "Save calculation" list, which is a different
                  thing from the automatic last-result cards above: these are
                  kept for 30 days and can be exported as a PDF or deleted.
                  Rendered only when the user has some, so a first-time visitor
                  isn't shown two empty "saved" panels in a row. */}
              {!taxCalcLoading && taxCalculations.length > 0 && (
                <Panel
                  title="Saved tax computations"
                  meta={`Kept for 30 days · ${taxCalculations.length} stored`}
                >
                  <ul className="space-y-3">
                    {taxCalculations.map((calc) => {
                      const daysLeft = getDaysUntilExpiry(calc.expiresAt);
                      return (
                        <li
                          key={calc.id}
                          className="flex flex-wrap items-start gap-4 rounded-2xl border border-rule bg-paper p-4"
                          data-testid={`saved-calc-${calc.id}`}
                        >
                          <div className="min-w-[12rem] flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-ink">
                                FY {calc.financialYear} (AY {calc.assessmentYear})
                              </p>
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-ink/70">
                                {calc.recommendedRegime === "new" ? "New" : "Old"} Regime
                              </span>
                            </div>
                            <p className="tabular-figures text-sm text-ink/65">
                              Gross ₹{parseFloat(calc.grossIncome).toLocaleString("en-IN")} · saves ₹
                              {parseFloat(calc.savings).toLocaleString("en-IN")} against the other
                              regime
                            </p>
                            <p className="mt-1 text-xs text-ink/45">
                              Saved {formatDate(calc.createdAt)} ·{" "}
                              <span className={daysLeft <= 7 ? "text-notice" : ""}>
                                {daysLeft > 0 ? `expires in ${daysLeft} days` : "expired"}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] min-w-[44px] rounded-xl"
                              onClick={() => generatePDFFromHistory(calc)}
                              title="Download PDF"
                              aria-label="Download this computation as a PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] min-w-[44px] rounded-xl text-debit"
                              onClick={() => deleteCalculation(calc.id)}
                              disabled={deletingId === calc.id}
                              title="Delete"
                              aria-label="Delete this saved computation"
                            >
                              {deletingId === calc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}

              {/* ── Your practice ──
                  Accounting figures only make sense once the user has actually
                  registered a firm; everyone else used to see 0 / 0 / ₹0. */}
              {stats?.accounting && (
                <Panel
                  title="Your practice"
                  meta="From the accounting module"
                  action={<PanelLink href="/accounting">Open accounting →</PanelLink>}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: "Invoices",
                        value: stats.accounting.invoicesCount.toString(),
                        note: stats.accounting.paidInvoices
                          ? `${stats.accounting.paidInvoices} paid · ${stats.accounting.unpaidInvoices} pending`
                          : "No invoices yet",
                        icon: FileText,
                        money: false,
                      },
                      {
                        label: "Clients",
                        value: stats.accounting.clientsCount.toString(),
                        note: stats.accounting.clientsCount ? "Managed clients" : "Add your first",
                        icon: Building2,
                        money: false,
                      },
                      {
                        // The one genuinely money-positive figure on this page,
                        // and so the only one that earns green.
                        label: "Revenue",
                        value: `₹${parseFloat(stats.accounting.totalRevenue).toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}`,
                        note: stats.accounting.invoicesCount
                          ? `From ${stats.accounting.invoicesCount} invoices`
                          : "No revenue yet",
                        icon: Calculator,
                        money: true,
                      },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className={`rounded-2xl border border-rule p-4 ${
                          tile.money ? "bg-credit-wash" : "bg-paper"
                        }`}
                        data-testid={`stat-${tile.label.toLowerCase()}`}
                      >
                        <p className="field-label">{tile.label}</p>
                        <p
                          className={`tabular-figures mt-1 font-display text-2xl font-bold ${
                            tile.money ? "text-credit" : "text-ink"
                          }`}
                        >
                          {tile.value}
                        </p>
                        <p className="mt-1 text-xs text-ink/55">{tile.note}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {/* ── Recent activity + usage counters ── */}
              <Panel
                title="Your activity"
                meta={
                  stats?.lastActivityAt
                    ? `Last active ${getTimeAgo(stats.lastActivityAt)}`
                    : "Nothing logged yet"
                }
              >
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { label: "Calculations", value: stats?.calculationsRun ?? 0 },
                    { label: "Tools used", value: stats?.toolsUsed ?? 0 },
                    { label: "Results kept", value: stats?.savedResults ?? 0 },
                    { label: "Active days", value: stats?.activeDays ?? 0 },
                  ].map((tile) => (
                    <div
                      key={tile.label}
                      className="rounded-2xl border border-rule bg-paper p-4"
                      data-testid={`stat-${tile.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <p className="field-label">{tile.label}</p>
                      <p className="tabular-figures mt-1 font-display text-2xl font-bold text-ink">
                        {tile.value}
                      </p>
                    </div>
                  ))}
                </div>

                {toolUsageEvents.length > 0 ? (
                  <ul className="mt-5 space-y-2.5">
                    {toolUsageEvents.slice(0, 6).map((event) => (
                      <li
                        key={event.id}
                        className="flex items-start gap-3 border-b border-rule pb-2.5 last:border-b-0 last:pb-0"
                      >
                        <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{event.tool}</p>
                          {event.summary && (
                            <p className="truncate text-xs text-ink/65">{event.summary}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-ink/45">
                          {getTimeAgo(event.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5">
                    <EmptyState
                      what="No calculator activity yet. Anything you run while signed in shows up here."
                      next={<PanelLink href="/calculators">Browse the tools →</PanelLink>}
                    />
                  </div>
                )}
              </Panel>

              {/* Tools live at the bottom — the page is about your numbers first. */}
              <section className="rounded-[1.75rem] border border-rule bg-card p-6 sm:p-7">
                <h2 className="font-display text-lg font-bold text-ink">Jump into a tool</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {TOOLS.map((tool) => (
                    <Link
                      key={tool.to}
                      href={tool.to}
                      className="flex min-h-[44px] items-center rounded-full border border-rule bg-paper px-4 text-sm font-medium text-ink/75 transition-colors hover:border-credit hover:text-ink"
                    >
                      {tool.title}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
