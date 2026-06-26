import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  occupation: { name: string; value: number }[];
  states: { name: string; value: number }[];
  authProviders: { name: string; value: number }[];
}

const COLORS = [
  "#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-2.5">
      <p className="text-xs font-semibold text-slate-600 mb-1">{label ?? payload[0]?.name}</p>
      <p className="text-sm font-bold text-persian-blue-700">{payload[0]?.value} users</p>
    </div>
  );
};

const PieCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 22;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#475569"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: 11 }}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

export default function AdminAnalytics() {
  const { getIdToken } = useAuth();

  const { data, isLoading, isError, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-persian-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          <p className="text-sm font-medium text-slate-700">Failed to load analytics</p>
          <p className="text-xs text-red-500">{(error as Error)?.message}</p>
        </div>
      </AdminLayout>
    );
  }

  const hasData = (arr: any[]) => arr && arr.filter((d) => d.name !== "Not specified").length > 0;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">
            User demographics — occupation, geography, and sign-in method breakdown.
          </p>
        </div>

        {/* Occupation breakdown — bar chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-5">Occupation Breakdown</h2>
          {hasData(data?.occupation ?? []) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data?.occupation}
                margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Users" radius={[6, 6, 0, 0]}>
                  {data?.occupation.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No occupation data yet — users will fill this in when they complete their profile." />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top States */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-5">Top States</h2>
            {hasData(data?.states ?? []) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={(data?.states ?? []).slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Users" radius={[0, 6, 6, 0]}>
                    {(data?.states ?? []).slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No location data yet." />
            )}
          </div>

          {/* Auth Providers — pie chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-5">Sign-in Methods</h2>
            {data?.authProviders?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.authProviders}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={false}
                    label={PieCustomLabel}
                  >
                    {data.authProviders.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} users`, name]}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: 12, color: "#475569" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No sign-in data yet." />
            )}
          </div>
        </div>

        {/* Raw data table */}
        {data && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-x-auto">
            <h2 className="font-semibold text-slate-700 mb-4">Raw Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { title: "Occupation", rows: data.occupation },
                { title: "State", rows: data.states },
                { title: "Auth Provider", rows: data.authProviders },
              ].map(({ title, rows }) => (
                <div key={title}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {rows.map(({ name, value }) => (
                        <tr key={name} className="border-b border-slate-50">
                          <td className="py-1.5 text-slate-700">{name}</td>
                          <td className="py-1.5 text-right text-slate-500 font-medium">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-52 flex items-center justify-center">
      <p className="text-slate-400 text-sm text-center max-w-xs">{label}</p>
    </div>
  );
}
