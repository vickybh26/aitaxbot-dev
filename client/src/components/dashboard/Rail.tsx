/**
 * Rail — the dashboard's section nav.
 *
 * Ported from Lovable's Rail.tsx (2026-09-06): sticky icon rail on desktop
 * that collapses to a 68px strip, horizontal chips on mobile. The name and
 * year come from the signed-in user rather than their sample profile.
 */

import { useState } from "react";
import {
  Bookmark,
  CalendarClock,
  ChevronLeft,
  FileText,
  Gauge,
  PiggyBank,
} from "lucide-react";

const sections = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "deadlines", label: "Next up", icon: CalendarClock },
  { id: "deductions", label: "Deductions", icon: PiggyBank },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "saved", label: "Saved", icon: Bookmark },
] as const;

export default function Rail({
  fullName,
  financialYear,
}: {
  fullName: string;
  financialYear: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile: horizontal chips. 44px min height keeps these thumb-sized on
          the 360px-wide Androids most of our traffic arrives on. */}
      <nav
        aria-label="Dashboard sections"
        className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden"
      >
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex min-h-[44px] shrink-0 items-center rounded-full border border-rule bg-card px-4 text-xs font-semibold text-ink/70"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* Desktop: sticky rail */}
      <nav
        aria-label="Dashboard sections"
        className={`sticky top-24 hidden shrink-0 lg:block ${
          collapsed ? "w-[68px]" : "w-[216px]"
        }`}
      >
        <div className="rounded-[1.5rem] border border-rule bg-card p-3">
          {!collapsed && (
            <div className="px-2 pb-3 pt-1">
              <p className="truncate text-sm font-bold text-ink">{fullName}</p>
              <p className="truncate text-xs text-ink/55">FY {financialYear}</p>
            </div>
          )}
          <ul className="space-y-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  title={s.label}
                  className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink/70 transition-colors hover:bg-secondary hover:text-ink ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <s.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!collapsed && <span className="truncate">{s.label}</span>}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand section nav" : "Collapse section nav"}
            className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-ink/55 transition-colors hover:bg-secondary hover:text-ink"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              aria-hidden
            />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </nav>
    </>
  );
}
