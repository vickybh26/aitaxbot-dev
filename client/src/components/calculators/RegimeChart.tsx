/**
 * RegimeChart — the old-vs-new regime comparison bar chart.
 *
 * Split out of TaxCalculator.tsx purely so recharts can be code-split. It was a
 * plain function in that file, and its static `import ... from "recharts"` made
 * the 104 KB vendor-charts chunk a load-time dependency of the income tax
 * calculator — the page taking ~84% of site traffic — for one 180px chart that
 * only appears AFTER a calculation is run. Measured 2026-09-19.
 *
 * TaxCalculator now pulls this in with React.lazy, so recharts downloads when
 * a result is first rendered rather than when the page opens. Keep the recharts
 * import in this file and nowhere in TaxCalculator, or the chunk goes eager
 * again and nothing will visibly break to tell you.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { SUCCESS, INTERACTIVE, AXIS } from "@/lib/chartColors";

// ── Regime comparison bar chart ───────────────────────────────────────────────
export default function RegimeChart({
  oldTax,
  newTax,
  recommended,
}: {
  oldTax: number;
  newTax: number;
  recommended: 'old' | 'new';
}) {
  const fmt = (v: number) =>
    '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v);

  const data = [
    { name: 'Old Regime', tax: oldTax, winner: recommended === 'old' },
    { name: 'New Regime', tax: newTax, winner: recommended === 'new' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const { name, tax } = payload[0].payload;
      return (
        <div className="bg-card border border-rule rounded-lg px-3 py-2 text-xs shadow-md">
          <p className="font-semibold text-ink/80">{name}</p>
          <p className="text-ink font-bold">{fmt(tax)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AXIS.grid} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS.label }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="tax" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.winner ? SUCCESS : INTERACTIVE}
              opacity={entry.winner ? 1 : 0.65}
            />
          ))}
          <LabelList
            dataKey="tax"
            position="top"
            formatter={fmt}
            style={{ fontSize: 11, fontWeight: 600, fill: AXIS.emphasis }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
