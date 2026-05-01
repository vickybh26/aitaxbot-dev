import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Info, Plus, Trash2, RefreshCw, TrendingUp, DollarSign, BarChart2, Globe, ArrowLeftRight, FileText } from "lucide-react";

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
  const sign = n < 0 ? "-" : "";
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
    // Frankfurter API: free, no auth, CORS-enabled, ECB data (close enough for estimates)
    const res = await fetch(`https://api.frankfurter.app/${date}?from=USD&to=INR`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates?.INR ?? null;
  } catch {
    return null;
  }
}

// ─── Slab Rate Helper ─────────────────────────────────────────────────────────
// Returns tax for a given income amount at slab rate (new regime FY 2026-27)
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

function slabRateAt(income: number): number {
  if (income <= 400000) return 0;
  if (income <= 800000) return 5;
  if (income <= 1200000) return 10;
  if (income <= 1600000) return 15;
  if (income <= 2000000) return 20;
  if (income <= 2400000) return 25;
  return 30;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RateTag({ rate, fetching, onFetch }: { rate: number | null; fetching: boolean; onFetch: () => void }) {
  if (fetching) return <span className="text-xs text-blue-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />Fetching…</span>;
  if (rate) return <span className="text-xs text-green-700 font-medium">₹{rate.toFixed(2)}/USD</span>;
  return <button onClick={onFetch} className="text-xs text-blue-600 underline flex items-center gap-1"><RefreshCw className="w-3 h-3" />Fetch rate</button>;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-blue-400 bg-slate-50 px-4 py-3 text-sm text-slate-700 rounded-r">
      {children}
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-amber-500 bg-slate-50 px-4 py-3 text-sm text-slate-700 rounded-r flex gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <span>{children}</span>
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

  // Compute results
  const results = trades.map(t => {
    if (!t.buyRate || !t.sellRate || !t.buyPriceUSD || !t.sellPriceUSD || !t.quantity) return null;
    const costINR = t.buyPriceUSD * t.buyRate * t.quantity;
    const proceedsINR = t.sellPriceUSD * t.sellRate * t.quantity;
    const gainINR = proceedsINR - costINR;
    const months = monthsBetween(t.buyDate, t.sellDate);
    const isLTCG = months >= 24;
    const taxableGain = isLTCG ? Math.max(0, gainINR) : Math.max(0, gainINR);
    const tax = isLTCG ? taxableGain * 0.125 * 1.04 : taxableGain * (slabRate / 100) * 1.04;
    return { costINR, proceedsINR, gainINR, months, isLTCG, tax };
  });

  const totalGain = results.reduce((s, r) => s + (r?.gainINR ?? 0), 0);
  const totalTax = results.reduce((s, r) => s + (r?.tax ?? 0), 0);

  return (
    <div className="space-y-5">
      <InfoBox>
        <strong>24-month rule:</strong> US stocks held over 24 months → LTCG at 12.5% (no indexation).
        Under 24 months → STCG at your income slab rate. <strong>Not 12 months</strong> like Indian listed shares.
        FX rates are fetched from FBIL-equivalent market rates. Verify against RBI/FBIL for ITR.
      </InfoBox>

      {trades.map((t, i) => {
        const r = results[i];
        return (
          <div key={t.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">Trade #{i + 1}</span>
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs text-slate-500">Stock / ETF Name</Label>
                <Input placeholder="e.g. AAPL, VOO" value={t.stockName}
                  onChange={e => update(t.id, { stockName: e.target.value })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Quantity</Label>
                <Input type="number" min={0.001} step={0.001} value={t.quantity || ""}
                  onChange={e => update(t.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Buy Date</Label>
                <Input type="date" value={t.buyDate}
                  onChange={e => update(t.id, { buyDate: e.target.value, buyRate: null })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Buy Price (USD)</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00" value={t.buyPriceUSD || ""}
                  onChange={e => update(t.id, { buyPriceUSD: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Sell Date</Label>
                <Input type="date" value={t.sellDate}
                  onChange={e => update(t.id, { sellDate: e.target.value, sellRate: null })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Sell Price (USD)</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00" value={t.sellPriceUSD || ""}
                  onChange={e => update(t.id, { sellPriceUSD: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm mt-1" />
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => fetchRates(t.id, t.buyDate, t.sellDate)}
                disabled={!t.buyDate && !t.sellDate || t.fetching}>
                <RefreshCw className={`w-3 h-3 mr-1 ${t.fetching ? "animate-spin" : ""}`} />
                Fetch USD/INR Rates
              </Button>
              {t.buyRate && <span className="text-xs text-slate-500">Buy: <strong>₹{t.buyRate.toFixed(2)}</strong>/USD</span>}
              {t.sellRate && <span className="text-xs text-slate-500">Sell: <strong>₹{t.sellRate.toFixed(2)}</strong>/USD</span>}
            </div>

            {r && (
              <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">Cost (INR)</div>
                  <div className="font-semibold text-slate-800">{fmt(r.costINR)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Proceeds (INR)</div>
                  <div className="font-semibold text-slate-800">{fmt(r.proceedsINR)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Gain / Loss</div>
                  <div className={`font-bold ${r.gainINR >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(r.gainINR)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    {r.isLTCG ? "LTCG @ 12.5%" : `STCG @ ${slabRate}%`} · {r.months}m
                  </div>
                  <div className={`font-bold ${r.tax > 0 ? "text-red-600" : "text-green-700"}`}>
                    {r.gainINR < 0 ? "Loss — set off eligible" : fmt(r.tax)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={addTrade} className="border-dashed border-slate-300 text-slate-600 w-full">
        <Plus className="w-4 h-4 mr-1" /> Add Trade
      </Button>

      {trades.length > 0 && (
        <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">Total Capital Gain / Tax (US Stocks)</span>
          <div className="text-right">
            <div className={`font-bold ${totalGain >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(totalGain)} gain</div>
            <div className="text-xs text-slate-500">Est. tax: <strong>{fmt(totalTax)}</strong> · incl. 4% cess</div>
          </div>
        </div>
      )}

      <WarnBox>
        Holding US stocks on <strong>31 December</strong>? You must disclose them in <strong>Schedule FA</strong> of ITR-2.
        Non-disclosure penalty: ₹10 lakh per year under Black Money Act. Use ITR-2 (not ITR-1) if you have any US gains.
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
    return { dividendINR, taxBeforeCredit, usCreditINR, netTax };
  });

  const totalDividendINR = results.reduce((s, r) => s + (r?.dividendINR ?? 0), 0);
  const totalNetTax = results.reduce((s, r) => s + (r?.netTax ?? 0), 0);

  return (
    <div className="space-y-5">
      <InfoBox>
        US dividends are taxable in India at your slab rate. The US withholds tax at source —
        <strong> 15% if you submitted W-8BEN</strong> (most INDmoney / Vested users), or <strong>25% default</strong> without it.
        Enter the actual amount withheld from your broker statement.
        You can claim <strong>Foreign Tax Credit (FTC)</strong> for that US tax withheld — reduces your Indian tax.
        File <strong>Form 67</strong> before the ITR due date to claim FTC.
      </InfoBox>

      {dividends.map((d, i) => {
        const r = results[i];
        return (
          <div key={d.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">Dividend #{i + 1}</span>
              <button onClick={() => remove(d.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Stock / Fund</Label>
                <Input placeholder="e.g. AAPL dividend" value={d.description}
                  onChange={e => update(d.id, { description: e.target.value })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Pay Date</Label>
                <Input type="date" value={d.payDate}
                  onChange={e => update(d.id, { payDate: e.target.value, rate: null })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Dividend (USD)</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00" value={d.amountUSD || ""}
                  onChange={e => update(d.id, { amountUSD: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">US Tax Withheld (USD)</Label>
                <Input type="number" min={0} step={0.01} placeholder="0.00" value={d.withheldUSD || ""}
                  onChange={e => update(d.id, { withheldUSD: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => fetchRate(d.id, d.payDate)} disabled={!d.payDate || d.fetching}>
                <RefreshCw className={`w-3 h-3 mr-1 ${d.fetching ? "animate-spin" : ""}`} />
                Fetch Rate on Pay Date
              </Button>
              {d.rate && <span className="text-xs text-slate-500">Rate: <strong>₹{d.rate.toFixed(2)}/USD</strong></span>}
            </div>
            {r && (
              <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">Dividend (INR)</div>
                  <div className="font-semibold">{fmt(r.dividendINR)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tax @ {slabRate}% slab</div>
                  <div className="font-semibold">{fmt(r.taxBeforeCredit)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">DTAA Credit (US tax)</div>
                  <div className="font-semibold text-green-700">−{fmt(r.usCreditINR)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Net Tax Payable (India)</div>
                  <div className={`font-bold ${r.netTax > 0 ? "text-red-600" : "text-green-700"}`}>
                    {r.netTax === 0 ? "Nil (fully offset)" : fmt(r.netTax)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={add} className="border-dashed border-slate-300 text-slate-600 w-full">
        <Plus className="w-4 h-4 mr-1" /> Add Dividend
      </Button>

      {dividends.length > 0 && (
        <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">Total Dividends / Net Tax</span>
          <div className="text-right">
            <div className="font-bold text-slate-800">{fmt(totalDividendINR)} received</div>
            <div className="text-xs text-slate-500">Net tax after DTAA: <strong>{fmt(totalNetTax)}</strong></div>
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
  const equityFOPL = trades.filter(t => t.type === "equity-fo").reduce((s, t) => s + t.netPL, 0);
  const intradayPL = trades.filter(t => t.type === "intraday").reduce((s, t) => s + t.netPL, 0);
  const currencyPL = trades.filter(t => t.type === "currency-fo").reduce((s, t) => s + t.netPL, 0);
  const taxableProfit = Math.max(0, totalPL);
  const estimatedTax = taxableProfit * (slabRate / 100) * 1.04;
  const auditRequired = totalTurnover >= 10000000; // ₹1 crore threshold

  return (
    <div className="space-y-5">
      <InfoBox>
        <strong>Equity F&O</strong> (futures & options on NSE/BSE) = <strong>non-speculative business income</strong> — taxed at slab rate.
        Losses can be carried forward 8 years and set off against F&O profits.
        <br /><strong>Intraday equity</strong> = speculative business income — set off only against speculative income.
        <br /><strong>Currency derivatives on NSE</strong> = non-speculative business income.
        Enter your net P&L for each segment. Turnover = sum of absolute P&L values.
      </InfoBox>

      {trades.map((t, i) => (
        <div key={t.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-sm">Entry #{i + 1}</span>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Description</Label>
              <Input placeholder="e.g. NIFTY options FY2025-26" value={t.description}
                onChange={e => update(t.id, { description: e.target.value })}
                className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Type</Label>
              <select value={t.type} onChange={e => update(t.id, { type: e.target.value as IndianFOTrade["type"] })}
                className="h-8 text-sm mt-1 w-full border border-slate-200 rounded-md px-2 bg-white">
                <option value="equity-fo">Equity F&O (Non-Speculative)</option>
                <option value="intraday">Intraday Equity (Speculative)</option>
                <option value="currency-fo">Currency F&O on NSE (Non-Speculative)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Net P&L (₹) — negative for loss</Label>
              <Input type="number" step={1} placeholder="e.g. -45000 or 120000" value={t.netPL || ""}
                onChange={e => update(t.id, { netPL: parseFloat(e.target.value) || 0 })}
                className={`h-8 text-sm mt-1 ${t.netPL < 0 ? "border-red-300" : t.netPL > 0 ? "border-green-300" : ""}`} />
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={add} className="border-dashed border-slate-300 text-slate-600 w-full">
        <Plus className="w-4 h-4 mr-1" /> Add F&O / Intraday Entry
      </Button>

      {trades.length > 0 && (
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h4 className="font-semibold text-slate-800 mb-3 text-sm">F&O Tax Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Equity F&O Net P&L</div>
                <div className={`font-bold ${equityFOPL >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(equityFOPL)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Intraday Net P&L</div>
                <div className={`font-bold ${intradayPL >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(intradayPL)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Currency F&O Net P&L</div>
                <div className={`font-bold ${currencyPL >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(currencyPL)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Turnover</div>
                <div className="font-bold text-slate-800">{fmt(totalTurnover)}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm text-slate-600">Estimated Tax @ {slabRate}% slab + 4% cess</span>
              <span className={`font-bold text-lg ${estimatedTax > 0 ? "text-red-600" : "text-green-700"}`}>
                {totalPL <= 0 ? "Nil (loss year)" : fmt(estimatedTax)}
              </span>
            </div>
          </div>

          {auditRequired && (
            <WarnBox>
              <strong>Tax Audit likely required.</strong> Your F&O turnover exceeds ₹1 crore. Under Section 44AB,
              a CA audit may be required. Consult a CA — penalties for non-compliance are significant.
            </WarnBox>
          )}

          {totalPL < 0 && (
            <InfoBox>
              <strong>Loss year:</strong> F&O losses (non-speculative) can be carried forward for 8 years
              and set off against future F&O profits. File ITR-3 even for a loss year to preserve carry-forward.
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
    <div className="space-y-5">
      <InfoBox>
        US options/futures (SPY, QQQ, individual stock options) — treated as <strong>foreign business income</strong> in India,
        taxed at slab rate. Enter your net P&L in USD for each position close/expiry. FX conversion uses the
        rate on the date of settlement.
      </InfoBox>

      {trades.map((t, i) => {
        const r = results[i];
        return (
          <div key={t.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">Position #{i + 1}</span>
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Description</Label>
                <Input placeholder="e.g. SPY Dec Call" value={t.description}
                  onChange={e => update(t.id, { description: e.target.value })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Settlement / Expiry Date</Label>
                <Input type="date" value={t.date}
                  onChange={e => update(t.id, { date: e.target.value, rate: null })}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Net P&L (USD) — negative for loss</Label>
                <Input type="number" step={0.01} placeholder="e.g. -320.50 or 1200" value={t.netPLUSD || ""}
                  onChange={e => update(t.id, { netPLUSD: parseFloat(e.target.value) || 0 })}
                  className={`h-8 text-sm mt-1 ${t.netPLUSD < 0 ? "border-red-300" : t.netPLUSD > 0 ? "border-green-300" : ""}`} />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => fetchRate(t.id, t.date)} disabled={!t.date || t.fetching}>
                <RefreshCw className={`w-3 h-3 mr-1 ${t.fetching ? "animate-spin" : ""}`} />
                Fetch USD/INR Rate
              </Button>
              {t.rate && <span className="text-xs text-slate-500">Rate: <strong>₹{t.rate.toFixed(2)}/USD</strong></span>}
            </div>
            {r && (
              <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-sm border border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">P&L (INR)</div>
                  <div className={`font-bold ${r.plINR >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(r.plINR)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tax Rate</div>
                  <div className="font-semibold">{slabRate}% + 4% cess</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Estimated Tax</div>
                  <div className={`font-bold ${r.tax > 0 ? "text-red-600" : "text-green-700"}`}>
                    {r.plINR < 0 ? "Loss" : fmt(r.tax)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={add} className="border-dashed border-slate-300 text-slate-600 w-full">
        <Plus className="w-4 h-4 mr-1" /> Add US F&O / Options Position
      </Button>

      {trades.length > 0 && (
        <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">Total US F&O / Net Tax</span>
          <div className="text-right">
            <div className={`font-bold ${totalPLINR >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(totalPLINR)}</div>
            <div className="text-xs text-slate-500">Est. tax: <strong>{totalPLINR <= 0 ? "Nil" : fmt(totalTax)}</strong></div>
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
    <div className="space-y-5">
      <InfoBox>
        <strong>Currency F&O on NSE/BSE</strong> (USD-INR, EUR-INR futures/options) = <strong>non-speculative business income</strong>.
        <br /><strong>OTC Forex / retail forex platforms</strong> = <strong>speculative business income</strong> — losses can only be set off
        against speculative profits. Enter net annual P&L in INR for each segment.
      </InfoBox>
      <WarnBox>
        OTC forex trading through offshore platforms (non-SEBI regulated) may be illegal under FEMA.
        Consult a CA before filing if you traded through foreign forex brokers.
      </WarnBox>

      {trades.map((t, i) => (
        <div key={t.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-sm">Entry #{i + 1}</span>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Description</Label>
              <Input placeholder="e.g. USD/INR futures NSE" value={t.description}
                onChange={e => update(t.id, { description: e.target.value })}
                className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Type</Label>
              <select value={t.type} onChange={e => update(t.id, { type: e.target.value as ForexTrade["type"] })}
                className="h-8 text-sm mt-1 w-full border border-slate-200 rounded-md px-2 bg-white">
                <option value="exchange">NSE/BSE Currency F&O (Non-Speculative)</option>
                <option value="otc">OTC / Retail Forex (Speculative)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Net P&L (₹) — negative for loss</Label>
              <Input type="number" step={1} placeholder="e.g. -12000 or 45000" value={t.netPL || ""}
                onChange={e => update(t.id, { netPL: parseFloat(e.target.value) || 0 })}
                className={`h-8 text-sm mt-1 ${t.netPL < 0 ? "border-red-300" : t.netPL > 0 ? "border-green-300" : ""}`} />
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={add} className="border-dashed border-slate-300 text-slate-600 w-full">
        <Plus className="w-4 h-4 mr-1" /> Add Forex Entry
      </Button>

      {trades.length > 0 && (
        <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">Total Forex P&L / Tax</span>
          <div className="text-right">
            <div className={`font-bold ${totalPL >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(totalPL)}</div>
            <div className="text-xs text-slate-500">Est. tax: <strong>{totalPL <= 0 ? "Nil" : fmt(tax)}</strong></div>
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
  // US Stocks
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
  const stcgGain = usStockResults.reduce((s, r) => s + (!r?.isLTCG && r ? (r.gainINR > 0 ? r.gainINR : 0) : 0), 0);
  const usStockTax = usStockResults.reduce((s, r) => s + (r?.tax ?? 0), 0);

  // US Dividends
  const divResults = usDividends.map(d => {
    if (!d.rate || !d.amountUSD) return null;
    const dividendINR = d.amountUSD * d.rate;
    const tax = Math.max(0, dividendINR * (slabRate / 100) * 1.04 - d.withheldUSD * d.rate);
    return { dividendINR, tax };
  });
  const totalDividendINR = divResults.reduce((s, r) => s + (r?.dividendINR ?? 0), 0);
  const dividendTax = divResults.reduce((s, r) => s + (r?.tax ?? 0), 0);

  // Indian F&O
  const foProfit = Math.max(0, indianFO.reduce((s, t) => s + t.netPL, 0));
  const foTax = foProfit * (slabRate / 100) * 1.04;

  // US F&O
  const usFOProfit = Math.max(0, usFO.reduce((s, t) => s + (t.netPLUSD * (t.rate ?? 0)), 0));
  const usFOTax = usFOProfit * (slabRate / 100) * 1.04;

  // Forex
  const forexProfit = Math.max(0, forex.reduce((s, t) => s + t.netPL, 0));
  const forexTax = forexProfit * (slabRate / 100) * 1.04;

  const grandTotalTax = usStockTax + dividendTax + foTax + usFOTax + forexTax;

  const rows = [
    { label: "US Stocks LTCG (12.5%)", value: ltcgGain, tax: usStockResults.filter(r => r?.isLTCG).reduce((s, r) => s + (r?.tax ?? 0), 0), show: ltcgGain > 0 },
    { label: "US Stocks STCG (slab)", value: stcgGain, tax: usStockResults.filter(r => !r?.isLTCG && r).reduce((s, r) => s + (r?.tax ?? 0), 0), show: stcgGain > 0 },
    { label: "US Dividends (slab after DTAA credit)", value: totalDividendINR, tax: dividendTax, show: totalDividendINR > 0 },
    { label: "Indian F&O Profit (slab)", value: foProfit, tax: foTax, show: indianFO.length > 0 },
    { label: "US F&O / Options (slab)", value: usFOProfit, tax: usFOTax, show: usFO.length > 0 },
    { label: "Forex Trading (slab)", value: forexProfit, tax: forexTax, show: forex.length > 0 },
  ].filter(r => r.show);

  const hasData = rows.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-16 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Add trades in other tabs to see your combined tax summary here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="bg-slate-800 text-white px-4 py-3">
          <h3 className="font-semibold text-sm">Trading Income Tax Summary — FY 2025-26</h3>
          <p className="text-xs text-slate-400 mt-0.5">Slab rate used: {slabRate}% · New Regime applicable</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
              <th className="text-left px-4 py-2.5 font-medium">Income Category</th>
              <th className="text-right px-4 py-2.5 font-medium">Taxable Amount</th>
              <th className="text-right px-4 py-2.5 font-medium">Est. Tax (incl. 4% cess)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="px-4 py-3 text-slate-700">{r.label}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(r.value)}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(r.tax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200">
              <td className="px-4 py-3 font-bold text-slate-800">Total Estimated Tax</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right font-bold text-xl text-red-600">{fmt(grandTotalTax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InfoBox>
          <strong>Which ITR form?</strong><br />
          US stocks / dividends / US F&O → <strong>ITR-2</strong> (Schedule CG + Schedule FA)<br />
          Indian F&O + any trading → <strong>ITR-3</strong> (business income required)<br />
          If you have F&O AND US stocks, file ITR-3.
        </InfoBox>
        <WarnBox>
          This is an <strong>estimate only</strong> based on approximate exchange rates and simplified slab computation.
          Your actual tax depends on total income, surcharge, deductions, and existing losses. Consult a CA
          for your final ITR. File <strong>Form 67</strong> for US dividend DTAA credit.
        </WarnBox>
      </div>

      <div className="border border-slate-200 rounded-xl p-4 bg-white text-sm space-y-2">
        <h4 className="font-semibold text-slate-800">Compliance Checklist</h4>
        {[
          { done: true, text: "Use ITR-2 or ITR-3 (not ITR-1) — capital gains / foreign income" },
          { done: true, text: "Report US stocks in Schedule FA if held on 31 December" },
          { done: true, text: "File Form 67 before ITR due date to claim DTAA credit for US dividends" },
          { done: true, text: "FX rates: verify final figures against RBI / FBIL reference rates" },
          { done: indianFO.reduce((s, t) => s + Math.abs(t.netPL), 0) < 10000000, text: "Tax audit: required if Indian F&O turnover > ₹1 crore" },
          { done: true, text: "Advance tax: pay if total estimated tax > ₹10,000 to avoid Section 234B/C interest" },
        ].map((item, i) => (
          <div key={i} className={`flex gap-2 items-start ${item.done ? "text-slate-600" : "text-red-600 font-medium"}`}>
            <span className="shrink-0">{item.done ? "✓" : "⚠"}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode; short: string }[] = [
  { id: "us-stocks", label: "US Stocks & ETFs", icon: <TrendingUp className="w-4 h-4" />, short: "US Stocks" },
  { id: "us-dividends", label: "US Dividends", icon: <DollarSign className="w-4 h-4" />, short: "Dividends" },
  { id: "indian-fo", label: "Indian F&O", icon: <BarChart2 className="w-4 h-4" />, short: "India F&O" },
  { id: "us-fo", label: "US F&O / Options", icon: <Globe className="w-4 h-4" />, short: "US F&O" },
  { id: "forex", label: "Forex", icon: <ArrowLeftRight className="w-4 h-4" />, short: "Forex" },
  { id: "summary", label: "Tax Summary", icon: <FileText className="w-4 h-4" />, short: "Summary" },
];

export default function TradingTaxCalculator() {
  const [activeTab, setActiveTab] = useState<Tab>("us-stocks");
  const [slabRate, setSlabRate] = useState<number>(30);

  const [usStocks, setUSStocks] = useState<USTrade[]>([]);
  const [usDividends, setUSDividends] = useState<USDividend[]>([]);
  const [indianFO, setIndianFO] = useState<IndianFOTrade[]>([]);
  const [usFO, setUSFO] = useState<USFOTrade[]>([]);
  const [forex, setForex] = useState<ForexTrade[]>([]);

  const counts = {
    "us-stocks": usStocks.length,
    "us-dividends": usDividends.length,
    "indian-fo": indianFO.length,
    "us-fo": usFO.length,
    "forex": forex.length,
    "summary": 0,
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Global Setting */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-sm text-slate-600 font-medium">Your income slab rate (for STCG / business income tax):</span>
        </div>
        <select value={slabRate} onChange={e => setSlabRate(Number(e.target.value))}
          className="h-8 text-sm border border-slate-200 rounded-md px-2 bg-white font-semibold text-slate-800">
          <option value={5}>5% (Income ₹4L–₹8L)</option>
          <option value={10}>10% (Income ₹8L–₹12L)</option>
          <option value={15}>15% (Income ₹12L–₹16L)</option>
          <option value={20}>20% (Income ₹16L–₹20L)</option>
          <option value={25}>25% (Income ₹20L–₹24L)</option>
          <option value={30}>30% (Income above ₹24L)</option>
        </select>
        <span className="text-xs text-slate-400">New Regime slabs FY 2026-27. LTCG on US stocks always 12.5%.</span>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(tab => {
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 md:p-6">
        {activeTab === "us-stocks" && <USStocksTab trades={usStocks} setTrades={setUSStocks} slabRate={slabRate} />}
        {activeTab === "us-dividends" && <USDividendsTab dividends={usDividends} setDividends={setUSDividends} slabRate={slabRate} />}
        {activeTab === "indian-fo" && <IndianFOTab trades={indianFO} setTrades={setIndianFO} slabRate={slabRate} />}
        {activeTab === "us-fo" && <USFOTab trades={usFO} setTrades={setUSFO} slabRate={slabRate} />}
        {activeTab === "forex" && <ForexTab trades={forex} setTrades={setForex} slabRate={slabRate} />}
        {activeTab === "summary" && (
          <SummaryTab usStocks={usStocks} usDividends={usDividends} indianFO={indianFO} usFO={usFO} forex={forex} slabRate={slabRate} />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
        <p className="text-xs text-slate-400">
          Exchange rates via Frankfurter API (ECB data). For official ITR filing, verify rates against
          RBI/FBIL reference rates at rbi.org.in. This tool is for estimation only — not tax advice.
        </p>
      </div>
    </div>
  );
}
