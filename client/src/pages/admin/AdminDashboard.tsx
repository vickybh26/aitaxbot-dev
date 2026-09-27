import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  ChartNoAxesCombined,
  Clock3,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { NAVY, AXIS } from "@/lib/chartColors";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AdminStats {
  totalUsers: number;
  newUsersWeek: number;
  newUsersMonth: number;
  totalCalculations: number;
  completedProfiles: number;
  profileCompletionRate: number;
  signupTrend: { date: string; signups: number }[];
  activeUsers: number;
  returningUsers: number;
  returningUserRate: number;
  topTools: { name: string; uses: number; users: number }[];
  usageMetricsCapped: boolean;
  usageEventsScanned: number;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  detail?: string;
}) {
  return (
    <article className="min-h-[150px] rounded-2xl border border-rule bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">{label}</p>
          <p className="mt-3 text-3xl font-bold leading-none tracking-tight text-ink tabular-figures">
            {value}
          </p>
        </div>
        <span aria-hidden="true" className="rounded-xl bg-ink/5 p-2.5 text-ink">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-ink/70">{description}</p>
      {detail && <p className="mt-1 text-xs font-medium text-ink/65">{detail}</p>}
    </article>
  );
}

function LoadingDashboard() {
  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6" aria-label="Loading dashboard" aria-busy="true">
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-ink/10" />
          <div className="h-8 w-56 animate-pulse rounded bg-ink/10" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-ink/5" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[150px] animate-pulse rounded-2xl border border-rule bg-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="h-[340px] animate-pulse rounded-2xl border border-rule bg-card" />
          <div className="h-[340px] animate-pulse rounded-2xl border border-rule bg-card" />
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  const { getIdToken, adminLevel } = useAuth();

  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <LoadingDashboard />;

  if (isError) {
    return (
      <AdminLayout>
        <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center text-center">
          <span className="rounded-2xl bg-notice-wash p-3 text-notice" aria-hidden="true">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-ink">Dashboard data didn’t load</h1>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Try refreshing this page. If the problem continues, check the Railway logs and Firebase service-account configuration.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const chartData = (stats?.signupTrend ?? []).map((day) => ({
    ...day,
    label: new Date(day.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
  }));
  const totalUsers = stats?.totalUsers ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const activeRate = totalUsers > 0 ? Math.min(100, Math.round((activeUsers / totalUsers) * 100)) : 0;
  const profileRate = Math.max(0, Math.min(100, stats?.profileCompletionRate ?? 0));
  const maxToolUses = Math.max(1, ...(stats?.topTools ?? []).map((tool) => tool.uses));

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 lg:space-y-7">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/65">Owner overview</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
              See whether people are finding AiTaxBot, using its tools, and coming back.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            Browse users <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        {stats?.usageMetricsCapped && (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-notice/25 bg-notice-wash px-4 py-3 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-notice" aria-hidden="true" />
            <p>
              Activity reached the {stats.usageEventsScanned.toLocaleString("en-IN")}-event reporting cap. Active, repeat, and tool figures may be undercounts for the last 30 days.
            </p>
          </div>
        )}

        <section aria-label="Audience metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Registered users"
            value={totalUsers.toLocaleString("en-IN")}
            description="All-time registered accounts"
            icon={Users}
          />
          <MetricCard
            label="Active users"
            value={activeUsers.toLocaleString("en-IN")}
            description="Used a tracked tool in the last 30 days"
            icon={Activity}
            detail={`${activeRate}% of registered users`}
          />
          <MetricCard
            label="Repeat users"
            value={(stats?.returningUsers ?? 0).toLocaleString("en-IN")}
            description="Used a tracked tool on 2+ days in the last 30 days"
            icon={UserCheck}
            detail={`${stats?.returningUserRate ?? 0}% of active users`}
          />
          <MetricCard
            label="New signups"
            value={(stats?.newUsersMonth ?? 0).toLocaleString("en-IN")}
            description="New accounts in the last 30 days"
            icon={UserPlus}
            detail={`${(stats?.newUsersWeek ?? 0).toLocaleString("en-IN")} in the last 7 days`}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <article className="min-w-0 rounded-2xl border border-rule bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ChartNoAxesCombined className="h-4 w-4 text-ink" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-ink">Signup activity</h2>
                </div>
                <p className="mt-1 text-sm text-ink/65">Daily registrations · rolling 30 days</p>
              </div>
              <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink">
                {(stats?.newUsersMonth ?? 0).toLocaleString("en-IN")} new
              </span>
            </div>

            {stats?.newUsersMonth ? (
              <div className="mt-5 h-[250px] w-full" role="img" aria-label={`Daily signup trend for the last 30 days. ${stats.newUsersMonth} new users.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={NAVY} stopOpacity={0.16} />
                        <stop offset="95%" stopColor={NAVY} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 5" stroke={AXIS.gridSubtle} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: AXIS.tick }}
                      tickLine={false}
                      axisLine={false}
                      interval={5}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: AXIS.tick }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={34}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, fontSize: 12 }}
                      itemStyle={{ color: NAVY, fontSize: 12 }}
                      formatter={(value: number) => [`${value} signups`, "New users"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="signups"
                      stroke={NAVY}
                      strokeWidth={2.5}
                      fill="url(#signupGrad)"
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-5 flex h-[250px] flex-col items-center justify-center rounded-xl bg-secondary px-6 text-center">
                <UserPlus className="h-6 w-6 text-ink/65" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">No new signups in this window</p>
                <p className="mt-1 max-w-xs text-sm leading-5 text-ink/65">Share a useful tax workflow and this chart will show when new accounts arrive.</p>
              </div>
            )}
          </article>

          <article className="min-w-0 rounded-2xl border border-rule bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-ink" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-ink">Tool reach</h2>
                </div>
                <p className="mt-1 text-sm text-ink/65">Where tracked activity is happening · last 30 days</p>
              </div>
              <Clock3 className="mt-0.5 h-4 w-4 text-ink/65" aria-hidden="true" />
            </div>

            {(stats?.topTools?.length ?? 0) > 0 ? (
              <ol className="mt-5 space-y-4">
                {stats!.topTools.map((tool, index) => (
                  <li key={tool.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="w-5 shrink-0 text-xs font-semibold text-ink/50">{String(index + 1).padStart(2, "0")}</span>
                        <span className="truncate text-sm font-semibold text-ink">{tool.name}</span>
                      </div>
                      <span className="shrink-0 text-xs text-ink/65">{tool.users.toLocaleString("en-IN")} users</span>
                    </div>
                    <div className="ml-7 mt-2 h-2 overflow-hidden rounded-full bg-ink/5" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-ink"
                        style={{ width: `${Math.max(5, Math.round((tool.uses / maxToolUses) * 100))}%` }}
                      />
                    </div>
                    <p className="ml-7 mt-1 text-xs text-ink/60">{tool.uses.toLocaleString("en-IN")} tracked uses</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-5 flex h-[250px] flex-col items-center justify-center rounded-xl bg-secondary px-6 text-center">
                <UsersRound className="h-6 w-6 text-ink/65" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">No tracked tool activity yet</p>
                <p className="mt-1 max-w-xs text-sm leading-5 text-ink/65">When signed-in users complete a tool flow, the most-used tools will appear here.</p>
              </div>
            )}
          </article>
        </section>

        <section aria-label="Profile completion" className="rounded-2xl border border-rule bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-ink/5 p-2.5 text-ink" aria-hidden="true">
                <UsersRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">Profile completion</h2>
                <p className="mt-1 text-sm text-ink/65">Share of registered accounts marked as having a complete profile.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-baseline gap-2 sm:text-right">
              <span className="text-2xl font-bold text-ink tabular-figures">{(stats?.completedProfiles ?? 0).toLocaleString("en-IN")}</span>
              <span className="text-sm text-ink/65">of {totalUsers.toLocaleString("en-IN")} · {profileRate}%</span>
            </div>
          </div>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-ink/5"
            role="progressbar"
            aria-label="Profile completion rate"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={profileRate}
          >
            <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${profileRate}%` }} />
          </div>
        </section>

        <div className="flex flex-col gap-2 border-t border-rule pt-4 text-xs text-ink/60 sm:flex-row sm:items-center sm:justify-between">
          <span>Activity and signup trends use a rolling 30-day window. Totals are all-time unless noted.</span>
          <span>{(stats?.totalCalculations ?? 0).toLocaleString("en-IN")} all-time calculations</span>
          <span>Stats refresh within about 5 minutes.</span>
        </div>

        {adminLevel === 1 && (
          <details className="rounded-2xl border border-rule bg-card px-5 shadow-sm">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
              Admin access setup
            </summary>
            <ol className="space-y-2 pb-5 pl-5 text-sm leading-6 text-ink/70 list-decimal">
              <li>Have the new admin sign in at <span className="font-mono text-ink">/login</span>.</li>
              <li>Find their Firebase Auth UID in Firebase Console.</li>
              <li>Create a Firestore document at <span className="font-mono text-ink">admin/{"<uid>"}</span> with a numeric <span className="font-mono text-ink">level</span> from 1 to 3, plus their name and email.</li>
              <li>Level 1 is Super Admin, Level 2 is Manager, and Level 3 is Viewer.</li>
            </ol>
          </details>
        )}
      </div>
    </AdminLayout>
  );
}
