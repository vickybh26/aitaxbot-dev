import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  UserCheck,
  Scale,
} from "lucide-react";
import { logout } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import logoImage from "@assets/aitaxbot-icon.png";
import ModalShell from "@/components/ui/modal-shell";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, minLevel: 3 },
  { href: "/admin/users", label: "Users & CRM", icon: Users, minLevel: 3 },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, minLevel: 3 },
  { href: "/admin/cas", label: "CA Directory", icon: UserCheck, minLevel: 3 },
  // Leads page removed from the admin panel (2026-07-18, per founder) — lead
  // captures are checked directly in the Firebase console instead. The
  // backend capture endpoints and the Firestore `leads` collection are
  // untouched; only this UI entry point is gone.
  { href: "/admin/ai-review", label: "AI Answer Review", icon: Scale, minLevel: 3 },
];

const LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Super Admin", color: "bg-red-100 text-red-700" },
  2: { label: "Manager", color: "bg-amber-100 text-amber-700" },
  3: { label: "Viewer", color: "bg-blue-100 text-ink" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, adminLevel } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const levelInfo = adminLevel ? LEVEL_LABELS[adminLevel] : null;

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={cn(
        "flex flex-col bg-ink text-white",
        mobile ? "w-64 h-full" : "w-64 h-screen sticky top-0 hidden md:flex"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-rule">
        <img src={logoImage} alt="AiTaxBot" className="h-8 w-8 object-contain" />
        <div>
          <div className="font-bold text-white text-sm">AiTaxBot</div>
          <div className="text-ink/45 text-xs">Admin Panel</div>
        </div>
      </div>

      {/* Admin badge */}
      {levelInfo && (
        <div className="mx-4 mt-4">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full",
              levelInfo.color
            )}
          >
            <Shield className="w-3 h-3" />
            {levelInfo.label}
          </span>
          <p className="text-ink/45 text-xs mt-1 truncate">{user?.email}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 mt-6 space-y-1">
        {navItems
          .filter((item) => !adminLevel || adminLevel <= item.minLevel)
          .map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-ink text-white shadow-md"
                    : "text-ink/35 hover:bg-ink hover:text-white"
                )}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto w-4 h-4 opacity-60" />}
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-rule space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-ink/45 hover:bg-ink hover:text-white transition-all"
        >
          ← Back to Website
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-ink/45 hover:bg-red-900/40 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-secondary">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <ModalShell
          onClose={() => setSidebarOpen(false)}
          label="Admin navigation"
          closeOnOverlayClick={false}
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">
            <Sidebar mobile />
          </div>
        </ModalShell>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-ink text-white">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Admin Panel</span>
          {sidebarOpen ? (
            <button onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-5" />
          )}
        </div>


        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
