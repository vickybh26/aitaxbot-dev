import { Link } from 'wouter';
import { Shield, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalcPageHeaderProps {
  title: string;
  subtitle: string;
  breadcrumbs: { label: string; href?: string }[];
  badge?: string;
  maxWidth?: string;
}

const trustChips = [
  { icon: Shield, text: "CA-Reviewed" },
  { icon: Zap,    text: "IT Act 2025 Ready" },
  { icon: Clock,  text: "FY 2026-27 Updated" },
];

/**
 * Shared header on every calculator/tool page (11 call sites as of
 * 2026-09-04 — see `grep -rl CalcPageHeader client/src/pages`). Re-skinned to
 * the "Warm Ledger" direction ported from Lovable that day: eyebrow pill with
 * a dot, display-font headline, softer badge. Content and prop interface are
 * unchanged — same breadcrumbs, same title/subtitle/badge values passed by
 * every caller, same trust chips — this is a re-skin, not a rewrite, so none
 * of the 11 call sites needed to change.
 */
export default function CalcPageHeader({
  title,
  subtitle,
  breadcrumbs,
  badge = "FY 2026-27 · AY 2027-28",
  maxWidth = "max-w-6xl"
}: CalcPageHeaderProps) {
  return (
    <header className="bg-paper">
      {/* Breadcrumb strip */}
      <div className={cn(maxWidth, "mx-auto px-6 pt-5")}>
        <nav className="flex items-center gap-1.5 text-xs text-neutral-500" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-muted-foreground">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[hsl(var(--interactive-blue))] transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-neutral-600 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Hero area */}
      <div className={cn(maxWidth, "mx-auto px-6 pt-6 pb-9")}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">

          {/* Left: eyebrow + title + subtitle + trust chips */}
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-persian-blue-50 px-4 py-1.5 text-xs font-semibold text-persian-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success-green))]" aria-hidden />
              {badge}
            </span>
            <h1 className="font-display mt-4 text-2xl md:text-3xl font-extrabold text-neutral-900 mb-2 leading-tight tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">
              {subtitle}
            </p>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-2 mt-5">
              {trustChips.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-persian-blue-700 text-xs font-medium rounded-full border border-persian-blue-100"
                >
                  <Icon className="h-3 w-3" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
