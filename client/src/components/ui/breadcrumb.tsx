import React from "react";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center space-x-1 text-sm text-ink/65 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        <li>
          <a 
            href="/" 
            className="flex items-center hover:text-primary transition-colors"
            data-testid="breadcrumb-home"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only">Home</span>
          </a>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-1 text-ink/40" />
            {item.current ? (
              <span 
                className="font-medium text-ink"
                aria-current="page"
                data-testid={`breadcrumb-current-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </span>
            ) : (
              <a 
                href={item.href} 
                className="hover:text-primary transition-colors"
                data-testid={`breadcrumb-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumb;