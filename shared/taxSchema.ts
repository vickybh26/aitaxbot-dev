// Unified Tax Data Schema for all Indian tax documents
// This schema standardizes data from Form 16, AIS, 26AS, TIS

export interface UnifiedTaxData {
  taxpayer: {
    name: string;
    pan: string;
    assessment_year: string;
    financial_year: string;
  };
  salary_income: {
    employer_name: string;
    gross_salary: number;
    exempt_allowances: {
      hra: number;
      leave_travel_allowance: number;
      gratuity: number;
      other: number;
    };
    perquisites: number;
    standard_deduction: number;
    net_salary: number;
  };
  house_property_income: {
    self_occupied_loss: number;
    let_out_income: number;
    total_house_property: number;
  };
  business_profession_income: {
    gross_receipts: number;
    expenses: number;
    net_profit: number;
  };
  capital_gains: {
    short_term: number;
    long_term: number;
    crypto_gains: number;
    total_capital_gains: number;
  };
  other_income: {
    interest_income: number;
    dividends: number;
    lottery_winnings: number;
    foreign_income: number;
    other: number;
  };
  deductions: {
    "80C": number;
    "80CCC": number;
    "80CCD1": number;
    "80CCD1B": number;
    "80CCD2": number;
    "80D": number;
    "80E": number;
    "80G": number;
    "80TTA": number;
    other: number;
    total_deductions: number;
  };
  tds_tcs: {
    tds_salary: number;
    tds_other: number;
    tcs: number;
    advance_tax: number;
    self_assessment_tax: number;
    total_tax_paid: number;
  };
  tax_computation: {
    gross_total_income: number;
    taxable_income: number;
    tax_liability: number;
    rebate_87A: number;
    surcharge: number;
    cess: number;
    total_tax_liability: number;
    tax_refund_or_payable: number;
  };
}

export interface DocumentProcessingResult {
  success: boolean;
  data?: UnifiedTaxData;
  error?: string;
  extractedText?: string;
  processingMethod: 'adobe_ai' | 'adobe_basic' | 'fallback';
}