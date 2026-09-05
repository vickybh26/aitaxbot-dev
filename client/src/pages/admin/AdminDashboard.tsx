import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import {
  Users,
  Calculator,
  TrendingUp,
  UserCheck,
  UserPlus,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { NAVY, AXIS } from "@/lib/chartColors";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-rule">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ink/55 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-ink mt-1">{value}</p>
          {sub && <p className="text-xs text-ink/55 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
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

  // Format date for chart labels
  const chartData =
    stats?.signupTrend.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    })) ?? [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink" />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <p className="text-sm font-medium text-ink/80">Failed to load dashboard stats</p>
          <p className="text-xs text-ink/55">Check Railway logs for Firestore errors, or verify FIREBASE_SERVICE_ACCOUNT is set.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-ink/55 text-sm mt-1">
            Overview of AiTaxBot users, calculations, and growth.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          <StatCard
            label="Total Users"
            value={(stats?.totalUsers ?? 0).toLocaleString("en-IN")}
            icon={Users}
            color="bg-ink"
          />
          <StatCard
            label="New This Week"
            value={(stats?.newUsersWeek ?? 0).toLocaleString("en-IN")}
            sub="last 7 days"
            icon={UserPlus}
            color="bg-emerald-500"
          />
          <StatCard
            label="New This Month"
            value={(stats?.newUsersMonth ?? 0).toLocaleString("en-IN")}
            sub="last 30 days"
            icon={Activity}
            color="bg-violet-500"
          />
          <StatCard
            label="Calculations"
            value={(stats?.totalCalculations ?? 0).toLocaleString("en-IN")}
            sub="all time"
            icon={Calculator}
            color="bg-amber-500"
          />
          <StatCard
            label="Profiles Done"
            value={(stats?.completedProfiles ?? 0).toLocaleString("en-IN")}
            sub="complete profiles"
            icon={UserCheck}
            color="bg-rose-500"
          />
          <StatCard
            label="Completion Rate"
            value={`${stats?.profileCompletionRate ?? 0}%`}
            sub="profile fill rate"
            icon={TrendingUp}
            color="bg-sky-500"
          />
          <StatCard
            label="Returning Users"
            value={(stats?.returningUsers ?? 0).toLocaleString("en-IN")}
            sub={`${stats?.returningUserRate ?? 0}% of ${(stats?.activeUsers ?? 0).toLocaleString("en-IN")} active users`}
            icon={UserCheck}
            color="bg-ink"
          />
        </div>

        {/* Signup trend chart */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-rule">
          <h2 className="font-semibold text-ink/80 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-ink" />
            Signups — Last 30 Days
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={NAVY} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS.gridSubtle} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: AXIS.tick }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 11, fill: AXIS.tick }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  labelStyle={{ color: AXIS.emphasis, fontWeight: 600, fontSize: 12 }}
                  itemStyle={{ color: NAVY, fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke={NAVY}
                  strokeWidth={2}
                  fill="url(#signupGrad)"
                  name="Signups"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-ink/55 text-sm">
              No signup data yet — send traffic to aitaxbot.co.in to start seeing trends here.
            </div>
          )}
        </div>

        {/* Admin setup instructions (Level 1 only) */}
        {adminLevel === 1 && (
          <div className="bg-gradient-to-r from-ink to-ink rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              🔧 How to add more admins
            </h3>
            <ol className="text-ink/35 text-sm space-y-1.5 list-decimal list-inside">
              <li>
                Have the new admin sign up (or sign in) at{" "}
                <span className="text-paper/60 font-mono">/login</span> with their Google
                account.
              </li>
              <li>
                Open{" "}
                <span className="font-mono text-paper/60">Firebase Console → Firestore</span>{" "}
                and find their <span className="font-mono">UID</span> in the{" "}
                <span className="font-mono">users</span> collection (if they also registered as a
                user). For admin-only accounts, get the UID from Firebase Auth.
              </li>
              <li>
                In Firestore, create a document:{" "}
                <span className="font-mono text-amber-300">admin / {"<uid>"}</span> with fields:{" "}
                <span className="font-mono text-amber-300">
                  {"{ level: 1|2|3, name: '...', email: '...' }"}
                </span>
              </li>
              <li>
                Level 1 = Super Admin (full), Level 2 = Manager (CRM + export), Level 3 = Viewer
                (read-only).
              </li>
              <li>
                ⚠️ Admin accounts should be kept separate — the same email should not exist in both{" "}
                <span className="font-mono">users</span> and <span className="font-mono">admins</span>{" "}
                collections.
              </li>
            </ol>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
