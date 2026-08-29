import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  computeHousePropertyIncome,
  toAmount,
  SELF_OCCUPIED_INTEREST_CAP,
  type HousePropertyDetails,
} from "../types";

interface HousePropertyStepProps {
  value: HousePropertyDetails;
  onChange: (next: HousePropertyDetails) => void;
}

export function isHousePropertyStepValid(value: HousePropertyDetails): boolean {
  const totalProperties = toAmount(value.numberOfProperties);
  const letOutCount = toAmount(value.numberOfLetOut);
  if (totalProperties < 1) return false;
  if (letOutCount > totalProperties) return false;
  // A let-out property with zero rent entered is almost certainly an
  // in-progress entry, not a real answer — don't let it silently pass as
  // "income: Rs.0" from a property that's actually earning rent.
  if (letOutCount > 0 && toAmount(value.annualRentReceived) <= 0) return false;
  return true;
}

function formatSignedINR(n: number): string {
  const rounded = Math.round(n);
  const formatted = `₹${Math.abs(rounded).toLocaleString("en-IN")}`;
  return rounded < 0 ? `−${formatted}` : formatted;
}

export default function HousePropertyStep({ value, onChange }: HousePropertyStepProps) {
  const totalProperties = toAmount(value.numberOfProperties);
  const letOutCount = toAmount(value.numberOfLetOut);
  const selfOccupiedCount = Math.max(0, totalProperties - letOutCount);
  const result = computeHousePropertyIncome(value);

  function updateText(key: keyof HousePropertyDetails, raw: string) {
    onChange({ ...value, [key]: raw.replace(/[^\d.]/g, "") });
  }

  function updateCount(key: "numberOfProperties" | "numberOfLetOut", raw: string) {
    const digits = raw.replace(/\D/g, "");
    onChange({ ...value, [key]: digits });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Your house property</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Self-occupied and rented-out properties are taxed differently — tell us the split.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hp-total">How many properties do you own?</Label>
          <Input
            id="hp-total"
            type="text"
            inputMode="numeric"
            value={value.numberOfProperties}
            onChange={(e) => updateCount("numberOfProperties", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="hp-letout">...and how many are rented out?</Label>
          <Input
            id="hp-letout"
            type="text"
            inputMode="numeric"
            value={value.numberOfLetOut}
            onChange={(e) => updateCount("numberOfLetOut", e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      {letOutCount > totalProperties && (
        <p className="text-xs text-destructive -mt-3">
          Rented-out count can't exceed the total number of properties.
        </p>
      )}

      {letOutCount > 0 && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-neutral-900">
            Rented-out {letOutCount === 1 ? "property" : `${letOutCount} properties`} (combined)
          </p>

          <div>
            <Label htmlFor="hp-rent">Total Annual Rent Received *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
              <Input
                id="hp-rent"
                type="text"
                inputMode="decimal"
                value={value.annualRentReceived}
                onChange={(e) => updateText("annualRentReceived", e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hp-municipal">Municipal Taxes Paid</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
              <Input
                id="hp-municipal"
                type="text"
                inputMode="decimal"
                value={value.municipalTaxesPaid}
                onChange={(e) => updateText("municipalTaxesPaid", e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Property tax paid to your municipal corporation — reduces the taxable rent.
            </p>
          </div>

          <div>
            <Label htmlFor="hp-letout-interest">Home Loan Interest (on rented-out property)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
              <Input
                id="hp-letout-interest"
                type="text"
                inputMode="decimal"
                value={value.letOutHomeLoanInterest}
                onChange={(e) => updateText("letOutHomeLoanInterest", e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              No upper limit for a rented-out property — the full interest is deductible.
            </p>
          </div>
        </div>
      )}

      {selfOccupiedCount > 0 && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-neutral-900">
            Self-occupied {selfOccupiedCount === 1 ? "property" : `${selfOccupiedCount} properties`} (combined)
          </p>
          <div>
            <Label htmlFor="hp-selfoccupied-interest">Home Loan Interest (self-occupied)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
              <Input
                id="hp-selfoccupied-interest"
                type="text"
                inputMode="decimal"
                value={value.selfOccupiedHomeLoanInterest}
                onChange={(e) => updateText("selfOccupiedHomeLoanInterest", e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Capped at ₹{SELF_OCCUPIED_INTEREST_CAP.toLocaleString("en-IN")}/year in total — we'll apply
              the cap automatically.
              {selfOccupiedCount > 2 &&
                " Note: only 2 self-occupied properties can have nil value; any beyond that are treated as let-out for tax purposes — talk to a CA if this applies to you."}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-neutral-50 p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-700">Income from House Property</span>
        <span
          className={`text-base font-bold tabular-figures money ${
            result.totalIncome < 0 ? "text-destructive" : "text-primary"
          }`}
        >
          {formatSignedINR(result.totalIncome)}
        </span>
      </div>
      {result.totalIncome < 0 && (
        <p className="text-xs text-neutral-500">
          A negative figure is a loss — it reduces your total taxable income (up to ₹2,00,000 can be
          set off against other income each year).
        </p>
      )}
    </div>
  );
}
