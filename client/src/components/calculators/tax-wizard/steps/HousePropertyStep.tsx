import { CountInput, Field, StringMoneyInput } from "@/components/calc/Field";
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
        <h2 className="font-display text-lg font-bold">Your house property</h2>
        <p className="text-sm text-ink/65 mt-1">
          Self-occupied and rented-out properties are taxed differently — tell us the split.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="How many properties do you own?">
          <CountInput id="hp-total" value={value.numberOfProperties} onChange={(v) => updateCount("numberOfProperties", v)} />
        </Field>
        <Field label="...and how many are rented out?">
          <CountInput id="hp-letout" value={value.numberOfLetOut} onChange={(v) => updateCount("numberOfLetOut", v)} />
        </Field>
      </div>
      {letOutCount > totalProperties && (
        <p className="text-xs text-debit -mt-3">
          Rented-out count can't exceed the total number of properties.
        </p>
      )}

      {letOutCount > 0 && (
        <div className="bento space-y-4 p-4">
          <p className="text-sm font-medium text-ink">
            Rented-out {letOutCount === 1 ? "property" : `${letOutCount} properties`} (combined)
          </p>

          <Field label="Total Annual Rent Received *">
            <StringMoneyInput id="hp-rent" value={value.annualRentReceived} onChange={(v) => updateText("annualRentReceived", v)} />
          </Field>

          <Field
            label="Municipal Taxes Paid"
            hint="Property tax paid to your municipal corporation — reduces the taxable rent."
          >
            <StringMoneyInput id="hp-municipal" value={value.municipalTaxesPaid} onChange={(v) => updateText("municipalTaxesPaid", v)} />
          </Field>

          <Field
            label="Home Loan Interest (on rented-out property)"
            hint="No upper limit for a rented-out property — the full interest is deductible."
          >
            <StringMoneyInput id="hp-letout-interest" value={value.letOutHomeLoanInterest} onChange={(v) => updateText("letOutHomeLoanInterest", v)} />
          </Field>
        </div>
      )}

      {selfOccupiedCount > 0 && (
        <div className="bento space-y-3 p-4">
          <p className="text-sm font-medium text-ink">
            Self-occupied {selfOccupiedCount === 1 ? "property" : `${selfOccupiedCount} properties`} (combined)
          </p>
          <Field
            label="Home Loan Interest (self-occupied)"
            hint={
              `Capped at ₹${SELF_OCCUPIED_INTEREST_CAP.toLocaleString("en-IN")}/year in total — we'll apply the cap automatically.` +
              (selfOccupiedCount > 2
                ? " Note: only 2 self-occupied properties can have nil value; any beyond that are treated as let-out for tax purposes — talk to a CA if this applies to you."
                : "")
            }
          >
            <StringMoneyInput id="hp-selfoccupied-interest" value={value.selfOccupiedHomeLoanInterest} onChange={(v) => updateText("selfOccupiedHomeLoanInterest", v)} />
          </Field>
        </div>
      )}

      <div className="rounded-2xl border border-rule bg-paper p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-ink/70">Income from House Property</span>
        <span
          className={`font-display text-base font-bold tabular-figures ${
            result.totalIncome < 0 ? "text-debit" : "text-ink"
          }`}
        >
          {formatSignedINR(result.totalIncome)}
        </span>
      </div>
      {result.totalIncome < 0 && (
        <p className="text-xs text-ink/55">
          A negative figure is a loss — it reduces your total taxable income (up to ₹2,00,000 can be
          set off against other income each year).
        </p>
      )}
    </div>
  );
}
