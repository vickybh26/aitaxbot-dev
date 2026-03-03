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
} from "lucide-react";
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
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
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

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load stats");
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-persian-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Overview of AiTaxBot users, calculations, and growth.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Total Users"
            value={(stats?.totalUsers ?? 0).toLocaleString("en-IN")}
            icon={Users}
            color="bg-persian-blue-600"
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
        </div>

        {/* Signup trend chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-persian-blue-600" />
            Signups — Last 30 Days
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  labelStyle={{ color: "#334155", fontWeight: 600, fontSize: 12 }}
                  itemStyle={{ color: "#4f46e5", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#signupGrad)"
                  name="Signups"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              No signup data yet — send traffic to aitaxbot.co.in to start seeing trends here.
            </div>
          )}
        </div>

        {/* Admin setup instructions (Level 1 only) */}
        {adminLevel === 1 && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              🔧 How to add more admins
            </h3>
            <ol className="text-slate-300 text-sm space-y-1.5 list-decimal list-inside">
              <li>
                Have the new admin sign up (or sign in) at{" "}
                <span className="text-persian-blue-300 font-mono">/login</span> with their Google
                account.
              </li>
              <li>
                Open{" "}
                <span className="font-mono text-persian-blue-300">Firebase Console → Firestore</span>{" "}
                and find their <span className="font-mono">UID</span> in the{" "}
                <span className="font-mono">users</span> collection (if they also registered as a
                user). For admin-only accounts, get the UID from Firebase Auth.
              </li>
              <li>
                In Firestore, create a document:{" "}
                <span className="font-mono text-amber-300">admins / {"<uid>"}</span> with fields:{" "}
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
