import { Link } from 'wouter';

interface CalcPageHeaderProps {
  title: string;
  subtitle: string;
  breadcrumbs: { label: string; href?: string }[];
  badge?: string;
}

export default function CalcPageHeader({
  title,
  subtitle,
  breadcrumbs,
  badge = "FY 2026-27 · Updated"
}: CalcPageHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left column: breadcrumb, title, subtitle */}
          <div className="flex-1">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {idx > 0 && <span>/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-blue-600 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-600">{crumb.label}</span>
                  )}
                </div>
              ))}
            </nav>

            {/* Title with left accent bar */}
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                {title}
              </h1>
              <p className="text-base text-slate-500 max-w-2xl">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Right column: badge */}
          <div className="flex-shrink-0 md:text-right">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
              {badge}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
