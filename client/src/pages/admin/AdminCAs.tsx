/**
 * AdminCAs — CA Directory Management
 * Approve, reject, or review pending CA profile registrations.
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, Eye, RefreshCw, Users, Trash2, AlertTriangle } from "lucide-react";

type CAStatus = "all" | "pending" | "approved" | "rejected";

interface CAProfile {
  id: string;
  fullName: string;
  icaiMembershipNumber: string;
  city: string;
  state: string;
  email: string;
  practiceAreas: string[];
  yearsOfPractice: number;
  bio?: string | null;
  status: "pending" | "approved" | "rejected";
  rejectedReason?: string | null;
  createdAt?: string;
  approvedAt?: string;
}

async function fetchCAs(token: string, status: CAStatus) {
  const params = status !== "all" ? `?status=${status}` : "";
  const r = await fetch(`/api/admin/ca/list${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Failed to fetch CAs");
  return r.json();
}

async function approveCA(token: string, id: string) {
  const r = await fetch(`/api/admin/ca/${id}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error("Failed to approve");
  return r.json();
}

async function rejectCA(token: string, id: string, reason: string) {
  const r = await fetch(`/api/admin/ca/${id}/reject`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!r.ok) throw new Error("Failed to reject");
  return r.json();
}

async function deleteCA(token: string, id: string) {
  const r = await fetch(`/api/admin/ca/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Failed to delete");
  return r.json();
}

const STATUS_COLOURS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const TABS: { key: CAStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminCAs() {
  const { getIdToken, adminLevel } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<CAStatus>("pending");
  const [selected, setSelected] = useState<CAProfile | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-cas", activeTab],
    queryFn: async () => {
      const token = await getIdToken();
      return fetchCAs(token!, activeTab);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getIdToken();
      return approveCA(token!, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cas"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const token = await getIdToken();
      return rejectCA(token!, id, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cas"] });
      setRejectOpen(false);
      setRejectReason("");
      setSelected(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getIdToken();
      return deleteCA(token!, id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cas"] });
      setDeleteOpen(false);
      setViewOpen(false);
      setSelected(null);
    },
  });

  const cas: CAProfile[] = data?.cas ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CA Directory</h1>
            <p className="text-slate-500 text-sm mt-1">
              Review and approve CA profile registrations
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : cas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
            <Users className="h-10 w-10 opacity-40" />
            <p>No CA profiles found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">ICAI No.</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">City</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Practice Areas</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cas.map((ca) => (
                  <tr key={ca.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{ca.fullName}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{ca.icaiMembershipNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{ca.city}, {ca.state}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(ca.practiceAreas ?? []).slice(0, 3).map((area) => (
                          <span key={area} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {area.replace(/_/g, " ")}
                          </span>
                        ))}
                        {(ca.practiceAreas ?? []).length > 3 && (
                          <span className="text-slate-500 text-xs">+{ca.practiceAreas.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {ca.createdAt ? new Date(ca.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOURS[ca.status]}`}>
                        {ca.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          title="View profile"
                          onClick={() => { setSelected(ca); setViewOpen(true); }}
                          className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(adminLevel ?? 0) <= 2 && ca.status === "pending" && (
                          <>
                            <button
                              title="Approve"
                              onClick={() => approveMutation.mutate(ca.id)}
                              disabled={approveMutation.isPending}
                              className="p-1 text-slate-500 hover:text-green-600 transition-colors disabled:opacity-40"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              title="Reject"
                              onClick={() => { setSelected(ca); setRejectOpen(true); }}
                              className="p-1 text-slate-500 hover:text-red-600 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {(adminLevel ?? 0) <= 1 && (
                          <button
                            title="Delete permanently"
                            onClick={() => { setSelected(ca); setDeleteOpen(true); }}
                            className="p-1 text-slate-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Profile Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>CA Profile — {selected?.fullName}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row label="ICAI No." value={selected.icaiMembershipNumber} />
              <Row label="Email" value={selected.email} />
              <Row label="City" value={`${selected.city}, ${selected.state}`} />
              <Row label="Experience" value={`${selected.yearsOfPractice} years`} />
              <Row label="Practice Areas" value={(selected.practiceAreas ?? []).map(a => a.replace(/_/g, " ")).join(", ")} />
              {selected.bio && <Row label="Bio" value={selected.bio} />}
              {selected.status === "rejected" && selected.rejectedReason && (
                <Row label="Rejection Reason" value={selected.rejectedReason} />
              )}
              <Row
                label="Status"
                value={
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOURS[selected.status]}`}>
                    {selected.status}
                  </span>
                }
              />
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {(adminLevel ?? 0) <= 1 && (
              <Button
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50 mr-auto"
                onClick={() => { setViewOpen(false); setDeleteOpen(true); }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
            {(adminLevel ?? 0) <= 2 && selected?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => { setViewOpen(false); setRejectOpen(true); }}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => { approveMutation.mutate(selected!.id); setViewOpen(false); }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Delete CA Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              You are about to <strong>permanently delete</strong> the profile for:
            </p>
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-semibold">{selected?.fullName}</p>
              <p className="text-slate-500">ICAI: {selected?.icaiMembershipNumber} · {selected?.email}</p>
            </div>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone. The CA will need to re-register if deleted by mistake.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              className="bg-red-700 hover:bg-red-800 text-white"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(selected!.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Yes, Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Reject CA — {selected?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Provide a reason. This will be emailed to the CA.</p>
            <Textarea
              aria-label="Reason for rejection"
              placeholder="e.g. ICAI membership number could not be verified. Please re-register with your valid membership details."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: selected!.id, reason: rejectReason || "Your profile did not meet our listing requirements." })}
            >
              {rejectMutation.isPending ? "Rejecting…" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}
