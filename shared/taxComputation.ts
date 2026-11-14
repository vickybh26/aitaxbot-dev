/** Shared PDF contract: data only, safe for browser and server imports. */
export interface RegimePDFData {
  // Salary
  grossSalary: number;
  basicDA?: number;
  hraReceived?: number;
  hraExemption?: number;
  ltaReceived?: number;
  ltaExemption?: number;
  otherAllowances?: number;
  otherAllowancesExemption?: number;
  bonus?: number;
  specialAllowances?: number;
  // Deductions u/s 16
  standardDeduction: number;
  professionalTax?: number;
  netSalary: number;
  // Other Income
  rentalIncome?: number;
  capitalGainsLTCG?: number;
  capitalGainsSTC?: number;
  dividendIncome?: number;
  otherIncome?: number;
  grossTotalIncome: number;
  // Chapter VI-A Deductions (only applicable in old regime)
  sec80C?: number;
  sec80D?: number;
  sec80E?: number;
  sec80TTA?: number;
  sec80CCD1B?: number;
  sec80G?: number;
  homeLoanInterest?: number;
  totalChapterVIA: number;
  // Tax computation
  taxableIncome: number;
  incomeTax: number;
  specialRateTax?: number;
  marginalRelief?: number;
  housePropertyLossNotSetOff?: number;
  rebate87A: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  monthlyTDS: number;
}

export interface TaxComputationData {
  personalInfo: {
    name: string;
    fatherName?: string;
    pan?: string;
    aadhaar?: string;
    address?: string;
    dateOfBirth?: string;
    status: string;
    ageGroup: string;
    residencyStatus?: string;
  };
  assessmentYear: string;
  financialYear: string;
  // New detailed both-regime data
  oldRegimeData?: RegimePDFData;
  newRegimeData?: RegimePDFData;
  recommendedRegime?: "old" | "new";
  savings?: number;
  // Legacy single-regime fields (kept for backward compat)
  regime?: "old" | "new";
  employer?: { name: string; tan?: string; address?: string };
  salary?: { grossSalary: number; standardDeduction: number; netSalary: number };
  otherIncome?: {
    interestIncome?: number;
    dividendIncome?: number;
    rentalIncome?: number;
    capitalGains?: { shortTerm?: number; longTerm?: number };
    otherSources?: number;
    total: number;
  };
  deductions?: {
    section80C?: number;
    section80D?: number;
    section80E?: number;
    section80TTA?: number;
    section80CCD1B?: number;
    nps80CCD1B?: number;
    section80G?: number;
    homeLoanInterest?: number;
    lta?: number;
    otherDeductions?: number;
    totalDeductions: number;
  };
  taxBreakdown: {
    taxableIncome: number;
    taxOnIncome: number;
    surcharge: number;
    cess: number;
    totalTax: number;
    tdsDeducted?: number;
    advanceTaxPaid?: number;
    selfAssessmentTax?: number;
    refundDue?: number;
    taxPayable?: number;
  };
  bankDetails?: { bankName: string; accountNumber: string; ifscCode: string };
  computationDate: Date;
}

/** Browser request: the server sets the computation timestamp. */
export type TaxComputationPayload = Omit<TaxComputationData, "computationDate"> & {
  oldRegimeData: RegimePDFData;
  newRegimeData: RegimePDFData;
};
