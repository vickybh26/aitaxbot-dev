import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Download,
  UserCircle,
  X,
  Tag,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  mobile: string | null;
  occupation: string | null;
  city: string | null;
  state: string | null;
  authProvider: string;
  isProfileComplete: boolean;
  tags: string[];
  createdAt: any;
  updatedAt: any;
}

interface AdminUserDetail extends AdminUser {
  gender: string | null;
  notes: { id: string; text: string; createdAt: any; adminEmail: string }[];
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Preset tags ────────────────────────────────────────────────────────────

const PRESET_TAGS = ["High Value", "Lead", "CA Client", "Follow Up", "VIP", "Inactive", "Referred"];

const TAG_COLORS: Record<string, string> = {
  "High Value": "bg-emerald-100 text-emerald-700",
  "Lead": "bg-blue-100 text-blue-700",
  "CA Client": "bg-violet-100 text-violet-700",
  "Follow Up": "bg-amber-100 text-amber-700",
  "VIP": "bg-rose-100 text-rose-700",
  "Inactive": "bg-slate-100 text-slate-600",
  "Referred": "bg-cyan-100 text-cyan-700",
};

const tagColor = (tag: string) => TAG_COLORS[tag] ?? "bg-slate-100 text-slate-700";

// ─── UserRow ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onSelect,
  selected,
}: {
  user: AdminUser;
  onSelect: (u: AdminUser) => void;
  selected: boolean;
}) {
  const joinedDate = user.createdAt?.toDate
    ? user.createdAt.toDate().toLocaleDateString("en-IN")
    : user.createdAt
    ? new Date(user.createdAt._seconds ? user.createdAt._seconds * 1000 : user.createdAt).toLocaleDateString("en-IN")
    : "—";

  return (
    <tr
      className={cn(
        "border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors",
        selected && "bg-persian-blue-50"
      )}
      onClick={() => onSelect(user)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <div>
            <div className="font-medium text-slate-800 text-sm">
              {user.firstName ?? ""} {user.lastName ?? ""}
              {!user.firstName && !user.lastName && <span className="text-slate-400">No name</span>}
            </div>
            <div className="text-slate-400 text-xs">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{user.occupation ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {user.city ? `${user.city}, ` : ""}
        {user.state ?? "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {user.tags?.length > 0
            ? user.tags.map((t) => (
                <span
                  key={t}
                  className={cn("text-xs px-2 py-0.5 rounded-full font-medium", tagColor(t))}
                >
                  {t}
                </span>
              ))
            : <span className="text-slate-300 text-xs">—</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        {user.isProfileComplete ? (
          <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Complete
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-400 text-xs">
            <Circle className="w-3.5 h-3.5" /> Incomplete
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">{joinedDate}</td>
    </tr>
  );
}

// ─── CRM Drawer ──────────────────────────────────────────────────────────────

function CRMDrawer({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { getIdToken, adminLevel } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");

  const { data: user, isLoading } = useQuery<AdminUserDetail>({
    queryKey: ["/api/admin/users", userId],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setNewNote("");
      qc.invalidateQueries({ queryKey: ["/api/admin/users", userId] });
      toast({ title: "Note added" });
    },
    onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const token = await getIdToken();
      await fetch(`/api/admin/users/${userId}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users", userId] });
      toast({ title: "Note deleted" });
    },
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/users/${userId}/tags`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users", userId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Tags updated" });
    },
    onError: () => toast({ title: "Failed to update tags", variant: "destructive" }),
  });

  const toggleTag = (tag: string) => {
    if (!user) return;
    const current = user.tags ?? [];
    const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    updateTagsMutation.mutate(updated);
  };

  const addCustomTag = () => {
    if (!newTag.trim() || !user) return;
    const current = user.tags ?? [];
    if (!current.includes(newTag.trim())) {
      updateTagsMutation.mutate([...current, newTag.trim()]);
    }
    setNewTag("");
  };

  const joinedDate = user?.createdAt
    ? user.createdAt?.toDate
      ? user.createdAt.toDate().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
      : new Date(user.createdAt._seconds ? user.createdAt._seconds * 1000 : user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const canWrite = adminLevel !== null && adminLevel <= 2;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-slate-800">User Profile &amp; CRM</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-persian-blue-600" />
            </div>
          ) : user ? (
            <>
              {/* User info */}
              <div className="flex items-start gap-3">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} className="w-14 h-14 rounded-2xl object-cover" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-800">
                    {user.firstName ?? ""} {user.lastName ?? ""}
                    {!user.firstName && !user.lastName && <span className="text-slate-400">No name</span>}
                  </div>
                  <div className="text-slate-500 text-sm">{user.email}</div>
                  {user.mobile && <div className="text-slate-400 text-xs mt-0.5">{user.mobile}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Occupation", value: user.occupation },
                  { label: "Gender", value: user.gender },
                  { label: "City", value: user.city },
                  { label: "State", value: user.state },
                  { label: "Auth", value: user.authProvider },
                  { label: "Joined", value: joinedDate },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-slate-700 mt-0.5">{value ?? "—"}</p>
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_TAGS.map((tag) => {
                    const active = user.tags?.includes(tag);
                    return (
                      <button
                        key={tag}
                        disabled={!canWrite}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full font-medium border transition-all",
                          active
                            ? `${tagColor(tag)} border-transparent shadow-sm`
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {canWrite && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Custom tag…"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                      className="text-sm h-8"
                    />
                    <Button size="sm" onClick={addCustomTag} variant="outline" className="h-8 px-3">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <StickyNote className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Notes</span>
                  <span className="ml-auto text-xs text-slate-400">{user.notes?.length ?? 0} note(s)</span>
                </div>

                {canWrite && (
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add a note… (Enter to save)"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newNote.trim()) {
                          addNoteMutation.mutate(newNote);
                        }
                      }}
                      className="text-sm h-8"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3 bg-persian-blue-600 hover:bg-persian-blue-700 text-white"
                      onClick={() => newNote.trim() && addNoteMutation.mutate(newNote)}
                      disabled={addNoteMutation.isPending}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {user.notes?.length > 0 ? (
                    user.notes.map((note) => {
                      const noteDate = note.createdAt?.toDate
                        ? note.createdAt.toDate().toLocaleDateString("en-IN")
                        : note.createdAt
                        ? new Date(note.createdAt._seconds ? note.createdAt._seconds * 1000 : note.createdAt).toLocaleDateString("en-IN")
                        : "—";
                      return (
                        <div
                          key={note.id}
                          className="bg-amber-50 border border-amber-100 rounded-xl p-3 group"
                        >
                          <p className="text-slate-700 text-sm leading-relaxed">{note.text}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-slate-400">
                              {note.adminEmail} · {noteDate}
                            </div>
                            {adminLevel === 1 && (
                              <button
                                onClick={() => deleteNoteMutation.mutate(note.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 text-xs italic">No notes yet.</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Super Admin: delete user */}
        {adminLevel === 1 && (
          <div className="p-4 border-t border-slate-200 bg-red-50">
            <p className="text-xs text-red-600 font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
            </p>
            <button
              onClick={() => {
                // Dispatch a custom event so the parent page can open the confirm dialog
                window.dispatchEvent(new CustomEvent("admin:delete-user-request", { detail: userId }));
              }}
              className="text-xs text-red-700 border border-red-300 rounded px-3 py-1.5 hover:bg-red-100 transition-colors w-full font-medium"
            >
              Delete this user account permanently
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { getIdToken, adminLevel } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [occupationFilter, setOccupationFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const qc = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getIdToken();
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to delete user");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteUserOpen(false);
      setDeletingUserId(null);
      setSelectedUser(null);
      toast({ title: "User deleted", description: "The user account has been removed." });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  // Listen for delete-user events from the CRM drawer (child component)
  useEffect(() => {
    const handler = (e: Event) => {
      const userId = (e as CustomEvent).detail;
      if (userId) {
        setDeletingUserId(userId);
        setDeleteUserOpen(true);
      }
    };
    window.addEventListener("admin:delete-user-request", handler);
    return () => window.removeEventListener("admin:delete-user-request", handler);
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    // Simple debounce
    clearTimeout((window as any).__searchTimer);
    (window as any).__searchTimer = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  };

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(occupationFilter && { occupation: occupationFilter }),
    ...(stateFilter && { state: stateFilter }),
    ...(tagFilter && { tag: tagFilter }),
  });

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/admin/users", page, debouncedSearch, occupationFilter, stateFilter, tagFilter],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/users?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30_000,
  });

  const handleExport = async () => {
    const token = await getIdToken();
    const res = await fetch("/api/admin/export/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast({ title: "Export failed", variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aitaxbot-users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export downloaded!" });
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Users &amp; CRM</h1>
            <p className="text-slate-500 text-sm mt-1">
              {data?.total ?? "—"} users · Click a row to open CRM panel
            </p>
          </div>
          {adminLevel !== null && adminLevel <= 2 && (
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <select
              value={occupationFilter}
              onChange={(e) => { setOccupationFilter(e.target.value); setPage(1); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-persian-blue-500"
            >
              <option value="">All Occupations</option>
              {["Salaried", "Self-Employed", "Business Owner", "Freelancer", "Student", "Retired", "Other"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <select
              value={tagFilter}
              onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-persian-blue-500"
            >
              <option value="">All Tags</option>
              {PRESET_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {(occupationFilter || stateFilter || tagFilter || debouncedSearch) && (
              <button
                onClick={() => { setOccupationFilter(""); setStateFilter(""); setTagFilter(""); setSearch(""); setDebouncedSearch(""); setPage(1); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-persian-blue-600" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["User", "Occupation", "Location", "Tags", "Profile", "Joined"].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.users?.length ? (
                      data.users.map((u) => (
                        <UserRow
                          key={u.id}
                          user={u}
                          onSelect={setSelectedUser}
                          selected={selectedUser?.id === u.id}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Page {data.page} of {data.totalPages} · {data.total} users
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CRM Drawer */}
      {selectedUser && (
        <CRMDrawer userId={selectedUser.id} onClose={() => setSelectedUser(null)} />
      )}

      {/* Delete User Confirmation */}
      <Dialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Delete User Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              You are about to <strong>permanently delete</strong> this user account and all associated data.
            </p>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone. The user will be signed out immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteUserOpen(false); setDeletingUserId(null); }}>Cancel</Button>
            <Button
              className="bg-red-700 hover:bg-red-800 text-white"
              disabled={deleteUserMutation.isPending}
              onClick={() => deletingUserId && deleteUserMutation.mutate(deletingUserId)}
            >
              {deleteUserMutation.isPending ? "Deleting…" : "Yes, Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
