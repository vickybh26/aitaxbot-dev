import { Link } from 'wouter';
import { Award } from 'lucide-react';

export default function AuthorBox() {
  return (
    <section className="py-8 px-6 bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="w-14 h-14 bg-persian-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Award className="h-7 w-7 text-persian-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Prepared and reviewed by</p>
            <p className="text-lg font-semibold text-slate-900">AiTaxBot Expert Team</p>
            <p className="text-sm text-slate-600">Chartered Accountants & Tax Professionals</p>
            <Link href="/about" className="text-sm text-persian-blue-600 hover:text-persian-blue-700 underline mt-1 inline-block">
              About the author
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
