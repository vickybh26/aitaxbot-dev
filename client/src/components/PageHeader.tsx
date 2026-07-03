import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: Crumb[];
  /** Optional right-side badge, e.g. "Last Updated: June 20, 2026" */
  badge?: string;
  maxWidth?: string;
}

/**
 * Consistent page header for informational pages (About, Contact, Privacy, Terms).
 * Mirrors the visual style of CalcPageHeader so all pages feel cohesive.
 */
export default function PageHeader({ title, subtitle, breadcrumbs, badge, maxWidth = "max-w-4xl" }: PageHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-100">
      {/* Breadcrumb strip */}
      <div className={cn(maxWidth, "mx-auto px-6 pt-4")}>
        <nav className="flex items-center gap-1.5 text-xs text-slate-400" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-slate-300">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-blue-600 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-600 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Title area */}
      <div className={cn(maxWidth, "mx-auto px-6 pt-6 pb-8")}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {badge && (
            <div className="flex-shrink-0 md:pt-1">
              <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                {badge}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

