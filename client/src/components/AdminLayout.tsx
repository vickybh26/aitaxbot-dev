import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail,
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
  { href: "/admin/digest", label: "Monthly Digest", icon: Mail, minLevel: 2 },
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
          <div className="text-paper/60 text-xs">Admin Panel</div>
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
          <p className="text-paper/60 text-xs mt-1 truncate">{user?.email}</p>
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
                aria-current={isActive ? "page" : undefined}
                /* This sidebar is bg-ink, so its text has to come from the PAPER
                   scale, not the ink scale. It previously used text-ink/35 on
                   bg-ink — navy on navy, which computes to 1.00:1. Not "low
                   contrast": mathematically the same colour. Every nav item
                   except the active one was invisible until hovered, because
                   hover was the only rule that set a light colour.
                   text-paper/70 on bg-ink is 7.43:1.

                   The active row also used bg-ink on a bg-ink sidebar, so its
                   "highlight" was the sidebar itself. No paper tint reaches the
                   3:1 that non-text contrast wants (paper/35 peaks at 2.94:1),
                   so active is marked four ways instead of by fill alone: a
                   tint, full-strength text, heavier weight, the chevron that
                   was already there, and aria-current for anything not looking
                   at pixels. */
                className={cn(
                  "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                  isActive
                    /* Green left bar as a pseudo-element rather than a border-l:
                       it sits inside the rounded-xl without fighting the corner
                       radius, and adds no box width, so active and inactive rows
                       stay aligned to the same 16px text origin. */
                    ? "bg-paper/15 text-paper font-semibold shadow-md before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-credit-on-dark before:content-['']"
                    : "text-paper/70 font-medium hover:bg-paper/10 hover:text-paper"
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
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-paper/70 hover:bg-paper/10 hover:text-paper transition-all"
        >
          ← Back to Website
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-paper/70 hover:bg-red-900/40 hover:text-red-300 transition-all"
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
