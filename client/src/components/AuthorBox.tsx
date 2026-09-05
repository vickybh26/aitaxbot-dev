import { Link } from 'wouter';
import { Award } from 'lucide-react';

export default function AuthorBox() {
  return (
    <section className="py-8 px-6 bg-secondary border-t border-rule">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 p-6 bg-card rounded-lg border border-rule shadow-sm">
          <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
            <Award className="h-7 w-7 text-ink" />
          </div>
          <div>
            <p className="text-sm text-ink/55 mb-1">Prepared and reviewed by</p>
            <p className="text-lg font-semibold text-ink">AiTaxBot Expert Team</p>
            <p className="text-sm text-ink/65">Chartered Accountants & Tax Professionals</p>
            <Link href="/about" className="text-sm text-ink hover:text-credit underline mt-1 inline-block">
              About the author
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
