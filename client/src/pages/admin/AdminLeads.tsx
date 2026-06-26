/**
 * AdminLeads — Lead Capture Management
 * View all leads captured from tax computation download prompts.
 */

import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw, Users, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Lead {
  id: string;
  name: string;
  email: string;
  whatsapp?: string | null;
  source?: string;
  summaryText?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt?: string;
}

export default function AdminLeads() {
  const { getIdToken } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const token = await getIdToken();
      const r = await fetch("/api/admin/leads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${r.status}`);
      }
      return r.json();
    },
  });

  const leads: Lead[] = data?.leads ?? [];

  function exportCSV() {
    const rows = [
      ["Name", "Email", "WhatsApp", "Source", "Summary", "UTM Source", "UTM Medium", "UTM Campaign", "Date"],
      ...leads.map((l) => [
        l.name,
        l.email,
        l.whatsapp ?? "",
        l.source ?? "",
        (l.summaryText ?? "").replace(/,/g, ";"),
        l.utmSource ?? "",
        l.utmMedium ?? "",
        l.utmCampaign ?? "",
        l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aitaxbot-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
            <p className="text-slate-500 text-sm mt-1">
              {leads.length} lead{leads.length !== 1 ? "s" : ""} captured from tax calculation download prompts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            {leads.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm font-medium text-slate-700">Failed to load leads</p>
            <p className="text-xs text-red-500">{(error as Error)?.message}</p>
            <button onClick={() => refetch()} className="text-xs text-persian-blue-600 hover:underline">Retry</button>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <Users className="h-10 w-10 opacity-40" />
            <p>No leads yet. They'll appear here once users calculate their tax and enter their details.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Mobile</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tax Summary</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <a href={`mailto:${lead.email}`} className="hover:text-blue-600 transition-colors">
                        {lead.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.whatsapp ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{lead.source ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={lead.summaryText ?? ""}>
                      {lead.summaryText ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
