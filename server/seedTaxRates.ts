import { storage } from "./storage";
import type { TaxSlab, SurchargeSlab } from "@shared/schema";

const newRegimeSlabs202526: TaxSlab[] = [
  { min: 0, max: 400000, rate: 0 },
  { min: 400000, max: 800000, rate: 5 },
  { min: 800000, max: 1200000, rate: 10 },
  { min: 1200000, max: 1600000, rate: 15 },
  { min: 1600000, max: 2000000, rate: 20 },
  { min: 2000000, max: 2400000, rate: 25 },
  { min: 2400000, max: null, rate: 30 }
];

const newRegimeSlabs202627: TaxSlab[] = [
  { min: 0, max: 400000, rate: 0 },
  { min: 400000, max: 800000, rate: 5 },
  { min: 800000, max: 1200000, rate: 10 },
  { min: 1200000, max: 1600000, rate: 15 },
  { min: 1600000, max: 2000000, rate: 20 },
  { min: 2000000, max: 2400000, rate: 25 },
  { min: 2400000, max: null, rate: 30 }
];

const newRegimeSlabs202728: TaxSlab[] = [
  { min: 0, max: 400000, rate: 0 },
  { min: 400000, max: 800000, rate: 5 },
  { min: 800000, max: 1200000, rate: 10 },
  { min: 1200000, max: 1600000, rate: 15 },
  { min: 1600000, max: 2000000, rate: 20 },
  { min: 2000000, max: 2400000, rate: 25 },
  { min: 2400000, max: null, rate: 30 }
];

const oldRegimeSlabsBelow60: TaxSlab[] = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 5 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: null, rate: 30 }
];

const oldRegimeSlabs60to80: TaxSlab[] = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 500000, rate: 5 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: null, rate: 30 }
];

const oldRegimeSlabsAbove80: TaxSlab[] = [
  { min: 0, max: 500000, rate: 0 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: null, rate: 30 }
];

const surchargeSlabs: SurchargeSlab[] = [
  { min: 5000000, max: 10000000, rate: 10 },
  { min: 10000000, max: 20000000, rate: 15 },
  { min: 20000000, max: 50000000, rate: 25 },
  { min: 50000000, max: null, rate: 37 }
];

const surchargeSlabsNew: SurchargeSlab[] = [
  { min: 5000000, max: 10000000, rate: 10 },
  { min: 10000000, max: 20000000, rate: 15 },
  { min: 20000000, max: null, rate: 25 }
];

interface TaxRateConfig {
  assessmentYear: string;
  financialYear: string;
  regime: string;
  ageGroup: string;
  slabs: TaxSlab[];
  standardDeduction: string;
  rebateLimit: string;
  maxRebate: string;
  surchargeSlabs: SurchargeSlab[];
  cessRate: string;
  actReference: string;
  effectiveFrom: Date;
}

const taxRatesData: TaxRateConfig[] = [
  // AY 2025-26 (FY 2024-25) - Income Tax Act, 1961
  {
    assessmentYear: "2025-26",
    financialYear: "2024-25",
    regime: "new",
    ageGroup: "below60",
    slabs: newRegimeSlabs202526,
    standardDeduction: "75000",
    rebateLimit: "700000",
    maxRebate: "25000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2024-04-01")
  },
  {
    assessmentYear: "2025-26",
    financialYear: "2024-25",
    regime: "new",
    ageGroup: "60to80",
    slabs: newRegimeSlabs202526,
    standardDeduction: "75000",
    rebateLimit: "700000",
    maxRebate: "25000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2024-04-01")
  },
  {
    assessmentYear: "2025-26",
    financialYear: "2024-25",
    regime: "new",
    ageGroup: "above80",
    slabs: newRegimeSlabs202526,
    standardDeduction: "75000",
    rebateLimit: "700000",
    maxRebate: "25000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2024-04-01")
  },
  {
    assessmentYear: "2025-26",
    financialYear: "2024-25",
    regime: "old",
    ageGroup: "below60",
    slabs: oldRegimeSlabsBelow60,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2024-04-01")
  },
  {
    assessmentYear: "2025-26",
    financialYear: "2024-25",
    regime: "old",
    ageGroup: "60to80",
    slabs: oldRegimeSlabs60to80,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2024-04-01")
  },
  {
    assessmentYear: "2025-26",
    financialYear: "2024-25",
    regime: "old",
    ageGroup: "above80",
    slabs: oldRegimeSlabsAbove80,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2024-04-01")
  },

  // AY 2026-27 (FY 2025-26) - Income Tax Act, 1961
  {
    assessmentYear: "2026-27",
    financialYear: "2025-26",
    regime: "new",
    ageGroup: "below60",
    slabs: newRegimeSlabs202627,
    standardDeduction: "75000",
    rebateLimit: "1200000",
    maxRebate: "60000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2025-04-01")
  },
  {
    assessmentYear: "2026-27",
    financialYear: "2025-26",
    regime: "new",
    ageGroup: "60to80",
    slabs: newRegimeSlabs202627,
    standardDeduction: "75000",
    rebateLimit: "1200000",
    maxRebate: "60000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2025-04-01")
  },
  {
    assessmentYear: "2026-27",
    financialYear: "2025-26",
    regime: "new",
    ageGroup: "above80",
    slabs: newRegimeSlabs202627,
    standardDeduction: "75000",
    rebateLimit: "1200000",
    maxRebate: "60000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2025-04-01")
  },
  {
    assessmentYear: "2026-27",
    financialYear: "2025-26",
    regime: "old",
    ageGroup: "below60",
    slabs: oldRegimeSlabsBelow60,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2025-04-01")
  },
  {
    assessmentYear: "2026-27",
    financialYear: "2025-26",
    regime: "old",
    ageGroup: "60to80",
    slabs: oldRegimeSlabs60to80,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2025-04-01")
  },
  {
    assessmentYear: "2026-27",
    financialYear: "2025-26",
    regime: "old",
    ageGroup: "above80",
    slabs: oldRegimeSlabsAbove80,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 1961",
    effectiveFrom: new Date("2025-04-01")
  },

  // AY 2027-28 (FY 2026-27) - Income Tax Act, 2025
  {
    assessmentYear: "2027-28",
    financialYear: "2026-27",
    regime: "new",
    ageGroup: "below60",
    slabs: newRegimeSlabs202728,
    standardDeduction: "75000",
    rebateLimit: "1200000",
    maxRebate: "60000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 2025",
    effectiveFrom: new Date("2026-04-01")
  },
  {
    assessmentYear: "2027-28",
    financialYear: "2026-27",
    regime: "new",
    ageGroup: "60to80",
    slabs: newRegimeSlabs202728,
    standardDeduction: "75000",
    rebateLimit: "1200000",
    maxRebate: "60000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 2025",
    effectiveFrom: new Date("2026-04-01")
  },
  {
    assessmentYear: "2027-28",
    financialYear: "2026-27",
    regime: "new",
    ageGroup: "above80",
    slabs: newRegimeSlabs202728,
    standardDeduction: "75000",
    rebateLimit: "1200000",
    maxRebate: "60000",
    surchargeSlabs: surchargeSlabsNew,
    cessRate: "4",
    actReference: "Income Tax Act, 2025",
    effectiveFrom: new Date("2026-04-01")
  },
  {
    assessmentYear: "2027-28",
    financialYear: "2026-27",
    regime: "old",
    ageGroup: "below60",
    slabs: oldRegimeSlabsBelow60,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 2025",
    effectiveFrom: new Date("2026-04-01")
  },
  {
    assessmentYear: "2027-28",
    financialYear: "2026-27",
    regime: "old",
    ageGroup: "60to80",
    slabs: oldRegimeSlabs60to80,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 2025",
    effectiveFrom: new Date("2026-04-01")
  },
  {
    assessmentYear: "2027-28",
    financialYear: "2026-27",
    regime: "old",
    ageGroup: "above80",
    slabs: oldRegimeSlabsAbove80,
    standardDeduction: "50000",
    rebateLimit: "500000",
    maxRebate: "12500",
    surchargeSlabs: surchargeSlabs,
    cessRate: "4",
    actReference: "Income Tax Act, 2025",
    effectiveFrom: new Date("2026-04-01")
  }
];

export async function seedTaxRates(): Promise<void> {
  console.log("Starting tax rates seeding...");
  
  try {
    const existingRates = await storage.getAllTaxRates();
    
    if (existingRates.length > 0) {
      console.log(`Found ${existingRates.length} existing tax rates. Skipping seed.`);
      return;
    }
    
    for (const rateConfig of taxRatesData) {
      await storage.createTaxRates({
        assessmentYear: rateConfig.assessmentYear,
        financialYear: rateConfig.financialYear,
        regime: rateConfig.regime,
        ageGroup: rateConfig.ageGroup,
        slabs: rateConfig.slabs,
        standardDeduction: rateConfig.standardDeduction,
        rebateLimit: rateConfig.rebateLimit,
        maxRebate: rateConfig.maxRebate,
        surchargeSlabs: rateConfig.surchargeSlabs,
        cessRate: rateConfig.cessRate,
        actReference: rateConfig.actReference,
        effectiveFrom: rateConfig.effectiveFrom,
        isActive: true
      });
      console.log(`Created tax rates for ${rateConfig.assessmentYear} - ${rateConfig.regime} - ${rateConfig.ageGroup}`);
    }
    
    console.log(`Successfully seeded ${taxRatesData.length} tax rate configurations.`);
  } catch (error) {
    console.error("Error seeding tax rates:", error);
    throw error;
  }
}

export async function getTaxSlabsForCalculation(
  assessmentYear: string,
  regime: string,
  ageGroup: string
): Promise<{
  slabs: TaxSlab[];
  standardDeduction: number;
  rebateLimit: number;
  maxRebate: number;
  surchargeSlabs: SurchargeSlab[];
  cessRate: number;
} | null> {
  const rates = await storage.getTaxRates(assessmentYear, regime, ageGroup);
  
  if (!rates) {
    console.log(`No tax rates found for ${assessmentYear} - ${regime} - ${ageGroup}`);
    return null;
  }
  
  return {
    slabs: rates.slabs as unknown as TaxSlab[],
    standardDeduction: parseFloat(rates.standardDeduction?.toString() || "75000"),
    rebateLimit: parseFloat(rates.rebateLimit?.toString() || "700000"),
    maxRebate: parseFloat(rates.maxRebate?.toString() || "25000"),
    surchargeSlabs: rates.surchargeSlabs as unknown as SurchargeSlab[],
    cessRate: parseFloat(rates.cessRate?.toString() || "4")
  };
}
