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
 * the ink/paper/credit/rule tokens the homepage now uses everywhere
 * (2026-09-05) — same eyebrow-pill-with-dot shape as the homepage's "For
 * individual taxpayers" badge, same font-display headline. Content and prop
 * interface are unchanged — same breadcrumbs, same title/subtitle/badge
 * values passed by every caller, same trust chips — this is a re-skin, not
 * a rewrite, so none of the 11 call sites needed to change.
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
        <nav className="flex items-center gap-1.5 text-xs text-ink/55" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-ink/25">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-credit transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink/70 font-medium">{crumb.label}</span>
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
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-ink/70">
              <span className="h-1.5 w-1.5 rounded-full bg-credit" aria-hidden />
              {badge}
            </span>
            <h1 className="font-display mt-4 text-2xl md:text-3xl font-extrabold text-ink mb-2 leading-tight tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-ink/65 max-w-2xl leading-relaxed">
              {subtitle}
            </p>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-2 mt-5">
              {trustChips.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-card text-ink/70 text-xs font-medium rounded-full border border-rule"
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
