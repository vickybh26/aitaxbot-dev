import { useState, useCallback } from "react";
import { useTrackToolUse } from '@/hooks/useTrackToolUse';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import ResultAuthGate from "@/components/ResultAuthGate";
import {
  AlertTriangle, Info, Plus, Trash2, RefreshCw, TrendingUp,
  DollarSign, BarChart2, Globe, ArrowLeftRight, FileText,
  CheckCircle2, Clock, ChevronRight, Zap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface USTrade {
  id: string;
  stockName: string;
  buyDate: string;
  buyPriceUSD: number;
  sellDate: string;
  sellPriceUSD: number;
  quantity: number;
  buyRate: number | null;
  sellRate: number | null;
  fetching: boolean;
}

interface USDividend {
  id: string;
  description: string;
  payDate: string;
  amountUSD: number;
  withheldUSD: number;
  rate: number | null;
  fetching: boolean;
}

interface IndianFOTrade {
  id: string;
  description: string;
  netPL: number;
  type: "equity-fo" | "intraday" | "currency-fo";
}

interface USFOTrade {
  id: string;
  description: string;
  netPLUSD: number;
  date: string;
  rate: number | null;
  fetching: boolean;
}

interface ForexTrade {
  id: string;
  description: string;
  netPL: number;
  type: "exchange" | "otc";
}

type Tab = "us-stocks" | "us-dividends" | "indian-fo" | "us-fo" | "forex" | "summary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
}

function monthsBetween(d1: string, d2: string): number {
  const a = new Date(d1), b = new Date(d2);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

async function fetchUSDINR(date: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.frankfurter.app/${date}?from=USD&to=INR`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates?.INR ?? null;
  } catch {
    return null;
  }
}

function computeSlabRate(income: number): number {
  if (income <= 400000) return 0;
  if (income <= 800000) return 5;
  if (income <= 1200000) return 10;
  if (income <= 1600000) return 15;
  if (income <= 2000000) return 20;
  if (income <= 2400000) return 25;
  return 30;
}

function slabBand(income: number): string {
  if (income <= 400000) return "Up to ₹4L";
  if (income <= 800000) return "₹4L – ₹8L";
  if (income <= 1200000) return "₹8L – ₹12L";
  if (income <= 1600000) return "₹12L – ₹16L";
  if (income <= 2000000) return "₹16L – ₹20L";
  if (income <= 2400000) return "₹20L – ₹24L";
  return "Above ₹24L";
}

function slabTax(income: number): number {
  if (income <= 0) return 0;
  let tax = 0;
  const slabs = [
    { limit: 400000, rate: 0 },
    { limit: 400000, rate: 0.05 },
    { limit: 400000, rate: 0.10 },
    { limit: 400000, rate: 0.15 },
    { limit: 400000, rate: 0.20 },
    { limit: 400000, rate: 0.25 },
    { limit: Infinity, rate: 0.30 },
  ];
  let remaining = income;
  for (const slab of slabs) {
    const chunk = Math.min(remaining, slab.limit);
    tax += chunk * slab.rate;
    remaining -= chunk;
    if (remaining <= 0) break;
  }
  return tax * 1.04; // 4% H&E cess
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-blue-400 bg-blue-50 px-4 py-3 text-sm text-slate-700 rounded-r">
      {children}
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-slate-700 rounded-r flex gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function RateStatus({ rate, fetching }: { rate: number | null; fetching: boolean }) {
  if (fetching) return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
      <RefreshCw className="w-3 h-3 animate-spin" /> Fetching rate…
    </span>
  );
  if (rate) return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
      <CheckCircle2 className="w-3 h-3" /> ₹{rate.toFixed(2)}/USD
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> Rate auto-fetches on date entry
    </span>
  );
}

// ─── Quick-start empty state ──────────────────────────────────────────────────

const INCOME_TYPES = [
  { id: "us-stocks" as Tab, icon: TrendingUp, label: "US Stocks & ETFs", desc: "AAPL, TSLA, VOO…", color: "text-persian-blue-700 bg-persian-blue-50 border-persian-blue-200" },
  { id: "us-dividends" as Tab, icon: DollarSign, label: "US Dividends", desc: "DTAA credit, Form 67", color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  { id: "indian-fo" as Tab, icon: BarChart2, label: "Indian F&O", desc: "Nifty, Bank Nifty…", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "us-fo" as Tab, icon: Globe, label: "US F&O / Options", desc: "SPY calls, QQQ puts…", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { id: "forex" as Tab, icon: ArrowLeftRight, label: "Forex Trading", desc: "USD-INR, NSE currency…", color: "text-rose-600 bg-rose-50 border-rose-200" },
];

function QuickStart({ onSelect }: { onSelect: (tab: Tab) => void }) {
  return (
    <div className="py-10 px-4 text-center space-y-6">
      <div>
        <div className="w-14 h-14 bg-persian-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Zap className="w-7 h-7 text-persian-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">What did you trade this year?</h3>
        <p className="text-sm text-slate-500 mt-1">Pick a category to get started. You can add more later.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
        {INCOME_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 hover:shadow-md transition-all ${t.color}`}
          >
            <t.icon className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{t.desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-40" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── US Stocks Tab ────────────────────────────────────────────────────────────

function USStocksTab({ trades, setTrades, slabRate }: {
  trades: USTrade[];
  setTrades: React.Dispatch<React.SetStateAction<USTrade[]>>;
  slabRate: number;
}) {
  const addTrade = () => setTrades(prev => [...prev, {
    id: uid(), stockName: "", buyDate: "", buyPriceUSD: 0, sellDate: "", sellPriceUSD: 0,
    quantity: 1, buyRate: null, sellRate: null, fetching: false,
  }]);

  const update = (id: string, field: Partial<USTrade>) =>
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...field } : t));

  const remove = (id: string) => setTrades(prev => prev.filter(t => t.id !== id));

  const fetchRates = useCallback(async (id: string, buyDate: string, sellDate: string) => {
    update(id, { fetching: true });
    const [buyRate, sellRate] = await Promise.all([
      buyDate ? fetchUSDINR(buyDate) : Promise.resolve(null),
      sellDate ? fetchUSDINR(sellDate) : Promise.resolve(null),
    ]);
    update(id, { buyRate, sellRate, fetching: false });
  }, []);

  const results = trades.map(t => {
    if (!t.buyRate || !t.sellRate || !t.buyPriceUSD || !t.sellPriceUSD || !t.quantity) return null;
    const costINR = t.buyPriceUSD * t.buyRate * t.quantity;
    const proceedsINR = t.sellPriceUSD * t.sellRate * t.quantity;
    const gainINR = proceedsINR - costINR;
    const months = monthsBetween(t.buyDate, t.sellDate);
    const isLTCG = months >= 24;
    const tax = isLTCG
      ? Math.max(0, gainINR) * 0.125 * 1.04
      : Math.max(0, gainINR) * (slabRate / 100) * 1.04;
    return { costINR, proceedsINR, gainINR, months, isLTCG, tax };
  });

  const totalGain = results.reduce((s, r) => s + (r?.gainINR ?? 0), 0);
  const totalTax = results.reduce((s, r) => s + (r?.tax ?? 0), 0);

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong>24-month rule:</strong> US stocks held &gt;24 months → LTCG at <strong>12.5%</strong> flat.
        Under 24 months → STCG at your income slab. Exchange rates are fetched automatically on date entry.
        Verify final figures against RBI/FBIL for ITR.
      </InfoBox>

      {trades.map((t, i) => {
        const r = results[i];
        const borderColor = r ? (r.gainINR > 0 ? "border-l-green-500" : r.gainINR < 0 ? "border-l-red-400" : "border-l-slate-200") : "border-l-slate-200";

        return (
          <div key={t.id} className={`border border-slate-200 border-l-4 ${borderColor} rounded-xl p-4 space-y-4 bg-white shadow-sm`}>
            {/* Card header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 text-sm">Trade #{i + 1}</span>
                {r && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.isLTCG ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {r.isLTCG ? `LTCG · ${r.months}m` : `STCG · ${r.months}m`}
                  </span>
                )}
              </div>
              <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Stock name + quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Stock / ETF</Label>
                <Input placeholder="e.g. AAPL, VOO, QQQ" value={t.stockName}
                  onChange={e => update(t.id, { stockName: e.target.value })}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Quantity (shares)</Label>
                <Input type="number" min={0.001} step={0.001} value={t.quantity || ""}
                  onChange={e => update(t.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-sm mt-1" />
              </div>
            </div>

            {/* Buy row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Buy Date</Label>
                <Input type="date" value={t.buyDate}
                  onChange={e => {
                    const d = e.target.value;
                    update(t.id, { buyDate: d, buyRate: null });
                    if (d && t.sellDate) fetchRates(t.id, d, t.sellDate);
                  }}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Buy Price (USD/share)</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00" value={t.buyPriceUSD || ""}
                  onChange={e => update(t.id, { buyPriceUSD: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-sm mt-1" />
              </div>
            </div>

            {/* Sell row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Sell Date</Label>
                <Input type="date" value={t.sellDate}
                  onChange={e => {
                    const d = e.target.value;
                    update(t.id, { sellDate: d, sellRate: null });
                    if (t.buyDate && d) fetchRates(t.id, t.buyDate, d);
                  }}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Sell Price (USD/share)</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00" value={t.sellPriceUSD || ""}
                  onChange={e => update(t.id, { sellPriceUSD: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-sm mt-1" />
              </div>
            </div>

            {/* FX status row */}
            <div className="flex items-center gap-3 flex-wrap">
              <RateStatus rate={t.buyRate} fetching={t.fetching} />
              {t.buyRate && t.sellRate && (
                <span className="text-xs text-slate-400">
                  Buy: ₹{t.buyRate.toFixed(2)} · Sell: ₹{t.sellRate.toFixed(2)}
                </span>
              )}
              {(t.buyDate || t.sellDate) && (
                <button onClick={() => fetchRates(t.id, t.buyDate, t.sellDate)}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 ml-auto">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              )}
            </div>

            {/* Result */}
            {r && (
              <div className={`rounded-xl p-4 ${r.gainINR >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Capital Gain / Loss</div>
                    <div className={`text-2xl font-bold ${r.gainINR >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {fmt(r.gainINR)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Cost {fmt(r.costINR)} → Proceeds {fmt(r.proceedsINR)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">
                      Est. Tax {r.isLTCG ? "(12.5% LTCG + cess)" : `(${slabRate}% slab + cess)`}
                    </div>
                    <div className={`text-2xl font-bold ${r.gainINR >= 0 ? "text-red-600" : "text-green-700"}`}>
                      {r.gainINR < 0 ? "Loss — set off eligible" : fmt(r.tax)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={addTrade}
        className="border-2 border-dashed border-slate-200 text-slate-500 hover:border-persian-blue-300 hover:text-persian-blue-700 w-full h-11 transition-colors">
        <Plus className="w-4 h-4 mr-2" /> Add Trade
      </Button>

      {trades.length > 0 && (
        <div className={`rounded-xl p-4 flex justify-between items-center ${totalGain >= 0 ? "bg-persian-blue-50 border border-persian-blue-100" : "bg-slate-50 border border-slate-200"}`}>
          <div>
            <div className="text-xs text-slate-500">Total gain across {trades.length} trade{trades.length > 1 ? "s" : ""}</div>
            <div className={`text-lg font-bold ${totalGain >= 0 ? "text-persian-blue-800" : "text-red-600"}`}>{fmt(totalGain)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Estimated tax (incl. 4% cess)</div>
            <div className="text-lg font-bold text-red-600">{fmt(totalTax)}</div>
          </div>
        </div>
      )}

      <WarnBox>
        Holding US stocks on <strong>31 December</strong>? Disclose in <strong>Schedule FA</strong> of ITR-2.
        Non-disclosure penalty: ₹10 lakh per year under Black Money Act 2015.
      </WarnBox>
    </div>
  );
}

// ─── US Dividends Tab ─────────────────────────────────────────────────────────

function USDividendsTab({ dividends, setDividends, slabRate }: {
  dividends: USDividend[];
  setDividends: React.Dispatch<React.SetStateAction<USDividend[]>>;
  slabRate: number;
}) {
  const add = () => setDividends(prev => [...prev, {
    id: uid(), description: "", payDate: "", amountUSD: 0, withheldUSD: 0, rate: null, fetching: false,
  }]);
  const update = (id: string, field: Partial<USDividend>) =>
    setDividends(prev => prev.map(d => d.id === id ? { ...d, ...field } : d));
  const remove = (id: string) => setDividends(prev => prev.filter(d => d.id !== id));

  const fetchRate = async (id: string, date: string) => {
    update(id, { fetching: true });
    const rate = await fetchUSDINR(date);
    update(id, { rate, fetching: false });
  };

  const results = dividends.map(d => {
    if (!d.rate || !d.amountUSD) return null;
    const dividendINR = d.amountUSD * d.rate;
    const taxBeforeCredit = dividendINR * (slabRate / 100) * 1.04;
    const usCreditINR = d.withheldUSD * d.rate;
    const netTax = Math.max(0, taxBeforeCredit - usCreditINR);
    const pctWithheld = d.amountUSD > 0 ? (d.withheldUSD / d.amountUSD * 100).toFixed(0) : "0";
    return { dividendINR, taxBeforeCredit, usCreditINR, netTax, pctWithheld };
  });

  const totalDividendINR = results.reduce((s, r) => s + (r?.dividendINR ?? 0), 0);
  const totalNetTax = results.reduce((s, r) => s + (r?.netTax ?? 0), 0);

  return (
    <div className="space-y-4">
      <InfoBox>
        US dividends are fully taxable in India at your slab rate. The US withholds tax at source —
        <strong> 15% if you submitted W-8BEN</strong> (most INDmoney / Vested users) or <strong>25% default</strong>.
        Claim credit for US tax withheld using <strong>Form 67</strong> — must be filed before the ITR due date.
      </InfoBox>

      {dividends.map((d, i) => {
        const r = results[i];
        return (
          <div key={d.id} className="border border-slate-200 border-l-4 border-l-cyan-400 rounded-xl p-4 space-y-4 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">Dividend #{i + 1}</span>
              <button onClick={() => remove(d.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Stock / Fund</Label>
                <Input placeholder="e.g. AAPL, VTI" value={d.description}
                  onChange={e => update(d.id, { description: e.target.value })}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Pay Date</Label>
                <Input type="date" value={d.payDate}
                  onChange={e => {
                    const dt = e.target.value;
                    update(d.id, { payDate: dt, rate: null });
                    if (dt) fetchRate(d.id, dt);
                  }}
                  className="h-9 text-sm mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Gross Dividend (USD)</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00" value={d.amountUSD || ""}
                  onChange={e => update(d.id, { amountUSD: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">US Tax Withheld (USD)</Label>
                <Input type="number" min={0} step={0.01} placeholder="15% or 25% of gross"
                  value={d.withheldUSD || ""}
                  onChange={e => update(d.id, { withheldUSD: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-sm mt-1" />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <RateStatus rate={d.rate} fetching={d.fetching} />
              {d.rate && (
                <button onClick={() => fetchRate(d.id, d.payDate)}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 ml-auto">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              )}
            </div>

            {r && (
              <div className="bg-cyan-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Dividend (INR)</div>
                    <div className="font-bold text-slate-800 text-lg">{fmt(r.dividendINR)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">DTAA Credit ({r.pctWithheld}% withheld)</div>
                    <div className="font-bold text-green-700 text-lg">−{fmt(r.usCreditINR)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Net Tax Payable</div>
                    <div className={`font-bold text-lg ${r.netTax > 0 ? "text-red-600" : "text-green-700"}`}>
                      {r.netTax === 0 ? "Nil ✓" : fmt(r.netTax)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={add}
        className="border-2 border-dashed border-slate-200 text-slate-500 hover:border-cyan-300 hover:text-cyan-600 w-full h-11 transition-colors">
        <Plus className="w-4 h-4 mr-2" /> Add Dividend
      </Button>

      {dividends.length > 0 && (
        <div className="rounded-xl p-4 flex justify-between items-center bg-cyan-50 border border-cyan-100">
          <div>
            <div className="text-xs text-slate-500">Total dividends received</div>
            <div className="text-lg font-bold text-cyan-700">{fmt(totalDividendINR)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Net tax after DTAA credit</div>
            <div className="text-lg font-bold text-red-600">{fmt(totalNetTax)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Indian F&O Tab ───────────────────────────────────────────────────────────

function IndianFOTab({ trades, setTrades, slabRate }: {
  trades: IndianFOTrade[];
  setTrades: React.Dispatch<React.SetStateAction<IndianFOTrade[]>>;
  slabRate: number;
}) {
  const add = () => setTrades(prev => [...prev, {
    id: uid(), description: "", netPL: 0, type: "equity-fo" as const,
  }]);
  const update = (id: string, field: Partial<IndianFOTrade>) =>
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...field } : t));
  const remove = (id: string) => setTrades(prev => prev.filter(t => t.id !== id));

  const totalPL = trades.reduce((s, t) => s + t.netPL, 0);
  const totalTurnover = trades.reduce((s, t) => s + Math.abs(t.netPL), 0);
  const taxableProfit = Math.max(0, totalPL);
  const estimatedTax = taxableProfit * (slabRate / 100) * 1.04;
  const auditRequired = totalTurnover >= 10000000;

  const typeLabel: Record<IndianFOTrade["type"], string> = {
    "equity-fo": "Equity F&O",
    "intraday": "Intraday Equity",
    "currency-fo": "Currency F&O",
  };

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong>Equity F&O & Currency F&O on NSE</strong> = non-speculative business income (Sec 43(5)) — taxed at slab.
        <strong> Intraday equity</strong> = speculative — set off only against speculative income.
        Turnover = sum of |P&L|. Tax audit required if turnover &gt; ₹1 crore.
      </InfoBox>

      {trades.map((t, i) => {
        const borderColor = t.netPL > 0 ? "border-l-amber-400" : t.netPL < 0 ? "border-l-red-400" : "border-l-slate-200";
        return (
          <div key={t.id} className={`border border-slate-200 border-l-4 ${borderColor} rounded-xl p-4 space-y-3 bg-white shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 text-sm">Entry #{i + 1}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {typeLabel[t.type]}
                </span>
              </div>
              <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Description</Label>
                <Input placeholder="e.g. NIFTY options FY25-26" value={t.description}
                  onChange={e => update(t.id, { description: e.target.value })}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Type</Label>
                <select value={t.type}
                  onChange={e => update(t.id, { type: e.target.value as IndianFOTrade["type"] })}
                  className="h-9 text-sm mt-1 w-full border border-slate-200 rounded-md px-2 bg-white">
                  <option value="equity-fo">Equity F&O (Non-Speculative)</option>
                  <option value="intraday">Intraday Equity (Speculative)</option>
                  <option value="currency-fo">Currency F&O on NSE (Non-Speculative)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Net P&L (₹)</Label>
                <Input type="number" step={1} placeholder="Profit is positive, loss is negative"
                  value={t.netPL || ""}
                  onChange={e => update(t.id, { netPL: parseFloat(e.target.value) || 0 })}
                  className={`h-9 text-sm mt-1 ${t.netPL < 0 ? "border-red-300 text-red-600" : t.netPL > 0 ? "border-green-300 text-green-700" : ""}`} />
              </div>
            </div>

            {t.netPL !== 0 && (
              <div className={`text-right text-sm font-semibold ${t.netPL > 0 ? "text-amber-700" : "text-red-500"}`}>
                {t.netPL > 0 ? `₹${t.netPL.toLocaleString("en-IN")} profit` : `₹${Math.abs(t.netPL).toLocaleString("en-IN")} loss`}
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={add}
        className="border-2 border-dashed border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 w-full h-11 transition-colors">
        <Plus className="w-4 h-4 mr-2" /> Add F&O / Intraday Entry
      </Button>

      {trades.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-100">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-xs text-slate-500">Net P&L across all F&O</div>
                <div className={`text-2xl font-bold mt-0.5 ${totalPL >= 0 ? "text-amber-700" : "text-red-600"}`}>{fmt(totalPL)}</div>
                <div className="text-xs text-slate-400 mt-1">Turnover: {fmt(totalTurnover)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Tax @ {slabRate}% slab + 4% cess</div>
                <div className={`text-2xl font-bold mt-0.5 ${totalPL <= 0 ? "text-green-700" : "text-red-600"}`}>
                  {totalPL <= 0 ? "Nil (loss year)" : fmt(estimatedTax)}
                </div>
              </div>
            </div>
          </div>

          {auditRequired && (
            <WarnBox>
              <strong>Tax Audit may be required.</strong> Your F&O turnover exceeds ₹1 crore (Section 44AB).
              Consult a CA before filing.
            </WarnBox>
          )}

          {totalPL < 0 && (
            <InfoBox>
              <strong>Loss year:</strong> F&O losses can be carried forward 8 years and set off against future F&O profits.
              File ITR-3 even in a loss year to preserve carry-forward.
            </InfoBox>
          )}
        </div>
      )}
    </div>
  );
}

// ─── US F&O Tab ───────────────────────────────────────────────────────────────

function USFOTab({ trades, setTrades, slabRate }: {
  trades: USFOTrade[];
  setTrades: React.Dispatch<React.SetStateAction<USFOTrade[]>>;
  slabRate: number;
}) {
  const add = () => setTrades(prev => [...prev, {
    id: uid(), description: "", netPLUSD: 0, date: "", rate: null, fetching: false,
  }]);
  const update = (id: string, field: Partial<USFOTrade>) =>
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...field } : t));
  const remove = (id: string) => setTrades(prev => prev.filter(t => t.id !== id));

  const fetchRate = async (id: string, date: string) => {
    update(id, { fetching: true });
    const rate = await fetchUSDINR(date);
    update(id, { rate, fetching: false });
  };

  const results = trades.map(t => {
    if (!t.rate || !t.netPLUSD) return null;
    const plINR = t.netPLUSD * t.rate;
    const tax = Math.max(0, plINR) * (slabRate / 100) * 1.04;
    return { plINR, tax };
  });

  const totalPLINR = results.reduce((s, r) => s + (r?.plINR ?? 0), 0);
  const totalTax = results.reduce((s, r) => s + (r?.tax ?? 0), 0);

  return (
    <div className="space-y-4">
      <InfoBox>
        US options & futures (SPY, QQQ, individual stock options) = <strong>foreign business income</strong> in India —
        taxed at slab rate. Enter net P&L per position. FX rate is fetched automatically on settlement date entry.
      </InfoBox>

      {trades.map((t, i) => {
        const r = results[i];
        const borderColor = r ? (r.plINR > 0 ? "border-l-emerald-400" : r.plINR < 0 ? "border-l-red-400" : "border-l-slate-200") : "border-l-slate-200";

        return (
          <div key={t.id} className={`border border-slate-200 border-l-4 ${borderColor} rounded-xl p-4 space-y-4 bg-white shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">Position #{i + 1}</span>
              <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Description</Label>
                <Input placeholder="e.g. SPY Dec Put" value={t.description}
                  onChange={e => update(t.id, { description: e.target.value })}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Settlement / Expiry Date</Label>
                <Input type="date" value={t.date}
                  onChange={e => {
                    const d = e.target.value;
                    update(t.id, { date: d, rate: null });
                    if (d) fetchRate(t.id, d);
                  }}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Net P&L (USD)</Label>
                <Input type="number" step={0.01} placeholder="Profit positive, loss negative"
                  value={t.netPLUSD || ""}
                  onChange={e => update(t.id, { netPLUSD: parseFloat(e.target.value) || 0 })}
                  className={`h-9 text-sm mt-1 ${t.netPLUSD < 0 ? "border-red-300 text-red-600" : t.netPLUSD > 0 ? "border-green-300 text-green-700" : ""}`} />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <RateStatus rate={t.rate} fetching={t.fetching} />
              {t.rate && (
                <button onClick={() => fetchRate(t.id, t.date)}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 ml-auto">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              )}
            </div>

            {r && (
              <div className={`rounded-xl p-4 ${r.plINR >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-500">P&L in INR</div>
                    <div className={`text-2xl font-bold ${r.plINR >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmt(r.plINR)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Est. Tax ({slabRate}% + cess)</div>
                    <div className={`text-2xl font-bold ${r.plINR < 0 ? "text-green-700" : "text-red-600"}`}>
                      {r.plINR < 0 ? "Loss" : fmt(r.tax)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={add}
        className="border-2 border-dashed border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 w-full h-11 transition-colors">
        <Plus className="w-4 h-4 mr-2" /> Add US F&O / Options Position
      </Button>

      {trades.length > 0 && (
        <div className="rounded-xl p-4 flex justify-between items-center bg-emerald-50 border border-emerald-100">
          <div>
            <div className="text-xs text-slate-500">Total P&L (INR)</div>
            <div className={`text-lg font-bold ${totalPLINR >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmt(totalPLINR)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Estimated tax</div>
            <div className="text-lg font-bold text-red-600">{totalPLINR <= 0 ? "Nil" : fmt(totalTax)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Forex Tab ────────────────────────────────────────────────────────────────

function ForexTab({ trades, setTrades, slabRate }: {
  trades: ForexTrade[];
  setTrades: React.Dispatch<React.SetStateAction<ForexTrade[]>>;
  slabRate: number;
}) {
  const add = () => setTrades(prev => [...prev, { id: uid(), description: "", netPL: 0, type: "exchange" as const }]);
  const update = (id: string, field: Partial<ForexTrade>) =>
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...field } : t));
  const remove = (id: string) => setTrades(prev => prev.filter(t => t.id !== id));

  const totalPL = trades.reduce((s, t) => s + t.netPL, 0);
  const tax = Math.max(0, totalPL) * (slabRate / 100) * 1.04;

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong>NSE/BSE Currency F&O</strong> = non-speculative business income. &nbsp;
        <strong>OTC / Retail Forex</strong> = speculative income (set off only against speculative profits).
        Enter annual net P&L in ₹ for each segment.
      </InfoBox>

      <WarnBox>
        OTC forex through offshore platforms may violate FEMA. Consult a CA if you traded via foreign forex brokers.
      </WarnBox>

      {trades.map((t, i) => {
        const borderColor = t.netPL > 0 ? "border-l-rose-400" : t.netPL < 0 ? "border-l-red-400" : "border-l-slate-200";
        return (
          <div key={t.id} className={`border border-slate-200 border-l-4 ${borderColor} rounded-xl p-4 space-y-3 bg-white shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">Entry #{i + 1}</span>
              <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Description</Label>
                <Input placeholder="e.g. USD/INR futures NSE" value={t.description}
                  onChange={e => update(t.id, { description: e.target.value })}
                  className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Type</Label>
                <select value={t.type}
                  onChange={e => update(t.id, { type: e.target.value as ForexTrade["type"] })}
                  className="h-9 text-sm mt-1 w-full border border-slate-200 rounded-md px-2 bg-white">
                  <option value="exchange">NSE/BSE Currency F&O (Non-Speculative)</option>
                  <option value="otc">OTC / Retail Forex (Speculative)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Net P&L (₹)</Label>
                <Input type="number" step={1} placeholder="Profit positive, loss negative"
                  value={t.netPL || ""}
                  onChange={e => update(t.id, { netPL: parseFloat(e.target.value) || 0 })}
                  className={`h-9 text-sm mt-1 ${t.netPL < 0 ? "border-red-300 text-red-600" : t.netPL > 0 ? "border-green-300 text-green-700" : ""}`} />
              </div>
            </div>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={add}
        className="border-2 border-dashed border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600 w-full h-11 transition-colors">
        <Plus className="w-4 h-4 mr-2" /> Add Forex Entry
      </Button>

      {trades.length > 0 && (
        <div className="rounded-xl p-4 flex justify-between items-center bg-rose-50 border border-rose-100">
          <div>
            <div className="text-xs text-slate-500">Total Forex P&L</div>
            <div className={`text-lg font-bold ${totalPL >= 0 ? "text-rose-700" : "text-red-600"}`}>{fmt(totalPL)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Estimated tax</div>
            <div className="text-lg font-bold text-red-600">{totalPL <= 0 ? "Nil" : fmt(tax)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({ usStocks, usDividends, indianFO, usFO, forex, slabRate }: {
  usStocks: USTrade[];
  usDividends: USDividend[];
  indianFO: IndianFOTrade[];
  usFO: USFOTrade[];
  forex: ForexTrade[];
  slabRate: number;
}) {
  const usStockResults = usStocks.map(t => {
    if (!t.buyRate || !t.sellRate || !t.buyPriceUSD || !t.sellPriceUSD || !t.quantity) return null;
    const costINR = t.buyPriceUSD * t.buyRate * t.quantity;
    const proceedsINR = t.sellPriceUSD * t.sellRate * t.quantity;
    const gainINR = proceedsINR - costINR;
    const isLTCG = monthsBetween(t.buyDate, t.sellDate) >= 24;
    const tax = Math.max(0, gainINR) * (isLTCG ? 0.125 : slabRate / 100) * 1.04;
    return { gainINR, tax, isLTCG };
  });

  const ltcgGain = usStockResults.reduce((s, r) => s + (r?.isLTCG && r.gainINR > 0 ? r.gainINR : 0), 0);
  const stcgGain = usStockResults.reduce((s, r) => s + (!r?.isLTCG && r && r.gainINR > 0 ? r.gainINR : 0), 0);
  const usStockTax = usStockResults.reduce((s, r) => s + (r?.tax ?? 0), 0);

  const divResults = usDividends.map(d => {
    if (!d.rate || !d.amountUSD) return null;
    const dividendINR = d.amountUSD * d.rate;
    const tax = Math.max(0, dividendINR * (slabRate / 100) * 1.04 - d.withheldUSD * d.rate);
    return { dividendINR, tax };
  });
  const totalDividendINR = divResults.reduce((s, r) => s + (r?.dividendINR ?? 0), 0);
  const dividendTax = divResults.reduce((s, r) => s + (r?.tax ?? 0), 0);

  const foProfit = Math.max(0, indianFO.reduce((s, t) => s + t.netPL, 0));
  const foTax = foProfit * (slabRate / 100) * 1.04;

  const usFOProfit = Math.max(0, usFO.reduce((s, t) => s + (t.netPLUSD * (t.rate ?? 0)), 0));
  const usFOTax = usFOProfit * (slabRate / 100) * 1.04;

  const forexProfit = Math.max(0, forex.reduce((s, t) => s + t.netPL, 0));
  const forexTax = forexProfit * (slabRate / 100) * 1.04;

  const grandTotal = usStockTax + dividendTax + foTax + usFOTax + forexTax;

  const hasF_O = indianFO.length > 0 || usFO.length > 0;
  const hasAnyForeign = usStocks.length > 0 || usDividends.length > 0 || usFO.length > 0 || forex.length > 0;
  const itrForm = hasF_O ? "ITR-3" : "ITR-2";

  const bars = [
    { label: "US Stocks LTCG (12.5%)", income: ltcgGain, tax: usStockResults.filter(r => r?.isLTCG).reduce((s, r) => s + (r?.tax ?? 0), 0), color: "bg-persian-blue-600" },
    { label: "US Stocks STCG (slab)", income: stcgGain, tax: usStockResults.filter(r => !r?.isLTCG && r).reduce((s, r) => s + (r?.tax ?? 0), 0), color: "bg-persian-blue-300" },
    { label: "US Dividends", income: totalDividendINR, tax: dividendTax, color: "bg-cyan-500" },
    { label: "Indian F&O", income: foProfit, tax: foTax, color: "bg-amber-500" },
    { label: "US F&O / Options", income: usFOProfit, tax: usFOTax, color: "bg-emerald-500" },
    { label: "Forex", income: forexProfit, tax: forexTax, color: "bg-rose-500" },
  ].filter(b => b.income > 0 || b.tax > 0);

  if (bars.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Add trades in other tabs to see your tax summary here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero total */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white">
        <div className="text-sm text-slate-400 mb-1">Total Estimated Tax — FY 2025-26</div>
        <div className="text-4xl font-bold">{fmt(grandTotal)}</div>
        <div className="text-sm text-slate-400 mt-1">Includes 4% Health & Education cess · New Regime</div>
        <div className="mt-4 flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${itrForm === "ITR-3" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}`}>
            <FileText className="w-3.5 h-3.5" /> File {itrForm}
          </span>
          {hasAnyForeign && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-500/20 text-red-300">
              <AlertTriangle className="w-3.5 h-3.5" /> Schedule FA required
            </span>
          )}
        </div>
      </div>

      {/* Tax breakdown bars */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-slate-800 text-sm">Tax Breakdown by Category</h4>
        {bars.map((b, i) => {
          const pct = grandTotal > 0 ? Math.round((b.tax / grandTotal) * 100) : 0;
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">{b.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs">{fmt(b.income)} income</span>
                  <span className="font-semibold text-slate-800 w-24 text-right">{fmt(b.tax)}</span>
                  <span className="text-slate-400 text-xs w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className={`${b.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Compliance checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h4 className="font-semibold text-slate-800 text-sm">Compliance Checklist</h4>
        {[
          { ok: true, text: `File ${itrForm} (not ITR-1) — capital gains / foreign income` },
          { ok: hasAnyForeign, text: "Schedule FA: disclose all foreign assets held on 31 December", warn: !hasAnyForeign },
          { ok: usDividends.length === 0, text: "Form 67: file before ITR due date to claim US dividend DTAA credit", warn: usDividends.length > 0 },
          { ok: true, text: "FX rates: verify final figures against RBI/FBIL reference rates" },
          { ok: indianFO.reduce((s, t) => s + Math.abs(t.netPL), 0) < 10000000, text: "Tax audit: required if Indian F&O turnover > ₹1 crore", warn: indianFO.reduce((s, t) => s + Math.abs(t.netPL), 0) >= 10000000 },
          { ok: true, text: "Advance tax: pay if total tax > ₹10,000 to avoid Sec 234B/C interest" },
        ].map((item, i) => (
          <div key={i} className={`flex gap-2.5 items-start text-sm ${item.warn ? "text-red-600 font-medium" : "text-slate-600"}`}>
            {item.warn
              ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              : <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      <WarnBox>
        This is an <strong>estimate only</strong>. Actual tax depends on total income, surcharge thresholds,
        deductions, and existing losses. Consult a CA for your final ITR filing.
      </WarnBox>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode; short: string; color: string }[] = [
  { id: "us-stocks", label: "US Stocks & ETFs", icon: <TrendingUp className="w-4 h-4" />, short: "US Stocks", color: "text-persian-blue-700 border-persian-blue-600" },
  { id: "us-dividends", label: "US Dividends", icon: <DollarSign className="w-4 h-4" />, short: "Dividends", color: "text-cyan-600 border-cyan-500" },
  { id: "indian-fo", label: "Indian F&O", icon: <BarChart2 className="w-4 h-4" />, short: "India F&O", color: "text-amber-600 border-amber-500" },
  { id: "us-fo", label: "US F&O / Options", icon: <Globe className="w-4 h-4" />, short: "US F&O", color: "text-emerald-600 border-emerald-500" },
  { id: "forex", label: "Forex", icon: <ArrowLeftRight className="w-4 h-4" />, short: "Forex", color: "text-rose-600 border-rose-500" },
  { id: "summary", label: "Tax Summary", icon: <FileText className="w-4 h-4" />, short: "Summary", color: "text-slate-700 border-slate-600" },
];

// Compute grand total for the live bar (duplicated from SummaryTab for the header)
function computeGrandTotal(
  usStocks: USTrade[], usDividends: USDividend[],
  indianFO: IndianFOTrade[], usFO: USFOTrade[],
  forex: ForexTrade[], slabRate: number
): number {
  const usStockTax = usStocks.reduce((s, t) => {
    if (!t.buyRate || !t.sellRate || !t.buyPriceUSD || !t.sellPriceUSD || !t.quantity) return s;
    const gain = (t.sellPriceUSD * t.sellRate - t.buyPriceUSD * t.buyRate) * t.quantity;
    const isLTCG = monthsBetween(t.buyDate, t.sellDate) >= 24;
    return s + Math.max(0, gain) * (isLTCG ? 0.125 : slabRate / 100) * 1.04;
  }, 0);
  const divTax = usDividends.reduce((s, d) => {
    if (!d.rate || !d.amountUSD) return s;
    return s + Math.max(0, d.amountUSD * d.rate * (slabRate / 100) * 1.04 - d.withheldUSD * d.rate);
  }, 0);
  const foTax = Math.max(0, indianFO.reduce((s, t) => s + t.netPL, 0)) * (slabRate / 100) * 1.04;
  const usFOTax = Math.max(0, usFO.reduce((s, t) => s + (t.netPLUSD * (t.rate ?? 0)), 0)) * (slabRate / 100) * 1.04;
  const fxTax = Math.max(0, forex.reduce((s, t) => s + t.netPL, 0)) * (slabRate / 100) * 1.04;
  return usStockTax + divTax + foTax + usFOTax + fxTax;
}

export default function TradingTaxCalculator() {
  const trackTool = useTrackToolUse();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("us-stocks");
  const [annualIncome, setAnnualIncome] = useState<number>(2500000);

  const [usStocks, setUSStocks] = useState<USTrade[]>([]);
  const [usDividends, setUSDividends] = useState<USDividend[]>([]);
  const [indianFO, setIndianFO] = useState<IndianFOTrade[]>([]);
  const [usFO, setUSFO] = useState<USFOTrade[]>([]);
  const [forex, setForex] = useState<ForexTrade[]>([]);

  const slabRate = computeSlabRate(annualIncome);
  const grandTotal = computeGrandTotal(usStocks, usDividends, indianFO, usFO, forex, slabRate);

  const counts = {
    "us-stocks": usStocks.length,
    "us-dividends": usDividends.length,
    "indian-fo": indianFO.length,
    "us-fo": usFO.length,
    "forex": forex.length,
    "summary": 0,
  };

  const hasAnyData = usStocks.length + usDividends.length + indianFO.length + usFO.length + forex.length > 0;

  const handleQuickStart = (tab: Tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

      {/* ── Setup bar ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-700">Annual income from salary / business</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">₹</span>
            <Input
              type="number"
              min={0}
              step={10000}
              value={annualIncome || ""}
              onChange={e => setAnnualIncome(parseInt(e.target.value) || 0)}
              placeholder="e.g. 1500000"
              className="h-8 w-36 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">→</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
              {slabRate}% marginal slab · {slabBand(annualIncome)}
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden md:inline">New Regime FY 2026-27 · LTCG on US stocks always 12.5%</span>
        </div>
      </div>

      {/* ── Live total bar ─────────────────────────────────────────────────── */}
      {hasAnyData && (
        <div
          className="border-b border-slate-200 px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => { setActiveTab("summary"); trackTool("Trading Tax Calculator", `Tax: ₹${Math.round(grandTotal).toLocaleString('en-IN')}`); fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {}); }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-slate-600">Running total</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <span className="text-lg font-bold text-red-600">{fmt(grandTotal)}</span>
            ) : (
              <span className="text-sm font-semibold text-blue-600">Sign in to view</span>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              View breakdown <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      )}

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(tab => {
            const count = counts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? `border-b-2 ${tab.color}`
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive ? "bg-slate-100 text-slate-700" : "bg-slate-100 text-slate-500"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="p-4 md:p-6">
        {/* Quick start if no data and not on summary */}
        {!hasAnyData && activeTab !== "summary" && (
          <QuickStart onSelect={handleQuickStart} />
        )}

        {/* Show tab content when either data exists or user is on summary */}
        {(hasAnyData || activeTab === "summary") && (
          <>
            {activeTab === "us-stocks" && <USStocksTab trades={usStocks} setTrades={setUSStocks} slabRate={slabRate} />}
            {activeTab === "us-dividends" && <USDividendsTab dividends={usDividends} setDividends={setUSDividends} slabRate={slabRate} />}
            {activeTab === "indian-fo" && <IndianFOTab trades={indianFO} setTrades={setIndianFO} slabRate={slabRate} />}
            {activeTab === "us-fo" && <USFOTab trades={usFO} setTrades={setUSFO} slabRate={slabRate} />}
            {activeTab === "forex" && <ForexTab trades={forex} setTrades={setForex} slabRate={slabRate} />}
            {activeTab === "summary" && (
              user
                ? <SummaryTab usStocks={usStocks} usDividends={usDividends} indianFO={indianFO} usFO={usFO} forex={forex} slabRate={slabRate} />
                : <ResultAuthGate toolName="Trading Tax Calculator" />
            )}
          </>
        )}

        {/* If user has data but clicks on a tab that's empty — still show the tab (just empty with add button) */}
        {hasAnyData && !["summary"].includes(activeTab) && (() => {
          const tabData = {
            "us-stocks": usStocks.length,
            "us-dividends": usDividends.length,
            "indian-fo": indianFO.length,
            "us-fo": usFO.length,
            "forex": forex.length,
            "summary": 0,
          };
          return null; // Tabs render their own empty state with Add button
        })()}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
        <p className="text-xs text-slate-400">
          Exchange rates via Frankfurter API (ECB data). Verify against RBI/FBIL reference rates at rbi.org.in for ITR. Estimation only — not tax advice.
        </p>
      </div>
    </div>
  );
}
