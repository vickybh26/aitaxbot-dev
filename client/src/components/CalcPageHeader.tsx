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

export default function CalcPageHeader({
  title,
  subtitle,
  breadcrumbs,
  badge = "FY 2026-27 · AY 2027-28",
  maxWidth = "max-w-6xl"
}: CalcPageHeaderProps) {
  return (
    <header className="bg-white border-b border-border">
      {/* Breadcrumb strip */}
      <div className={cn(maxWidth, "mx-auto px-6 pt-4")}>
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
      <div className={cn(maxWidth, "mx-auto px-6 pt-6 pb-8")}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">

          {/* Left: title + subtitle + trust chips */}
          <div className="flex-1">
            <div className="border-l-4 border-primary pl-4 mb-5">
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2 leading-tight">
                {title}
              </h1>
              <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-2 pl-4">
              {trustChips.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-persian-blue-50 text-primary text-xs font-medium rounded-full border border-persian-blue-100"
                >
                  <Icon className="h-3 w-3" />
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Right: badge */}
          <div className="flex-shrink-0">
            <span className="inline-block px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
              {badge}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

