/**
 * shared/schema.ts
 *
 * Pure TypeScript interfaces + Zod validation schemas.
 * No Drizzle / PostgreSQL dependency — all data lives in Firestore.
 */

import { z } from "zod";

// ─── Helper ────────────────────────────────────────────────────────────────

const optStr = z.string().optional().nullable();
const optNum = z.number().optional().nullable();

// ─── User ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  mobile?: string | null;
  gender?: string | null;
  occupation?: string | null;
  city?: string | null;
  state?: string | null;
  authProvider?: string | null;
  isProfileComplete?: boolean;
  tags?: string[];
  lastNudgedAt?: Date | string | null;
  /** Opted out of the weekly digest email (deadlines + usage summary). Unset/false = subscribed. */
  digestOptOut?: boolean;
  digestOptOutAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type UpsertUser = Omit<User, "createdAt" | "updatedAt">;

// ─── User Profile Log ──────────────────────────────────────────────────────

export interface UserProfileLog {
  id: string;
  userId: string;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  changedAt?: Date | string;
}

export type InsertUserProfileLog = Omit<UserProfileLog, "id" | "changedAt">;

// ─── Tax Rates ─────────────────────────────────────────────────────────────

export interface TaxSlab {
  min: number;
  max: number | null;
  rate: number;
}

export interface SurchargeSlab {
  min: number;
  max: number | null;
  rate: number;
}

export interface TaxRates {
  id: string;
  assessmentYear: string;
  financialYear?: string | null;
  regime: string;
  ageGroup: string;
  slabs: TaxSlab[];
  standardDeduction?: number | string | null;
  basicExemptionLimit?: number | string | null;
  rebate87A?: number | string | null;
  // Rebate fields (ITA 2025 / seed data — stored as strings in seed, parsed to number in use)
  rebateLimit?: number | string | null;
  maxRebate?: number | string | null;
  cessRate?: number | string | null;
  surchargeSlabs?: SurchargeSlab[] | null;
  marginalRelief?: boolean | null;
  actReference?: string | null;
  effectiveFrom?: string | Date | null;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type InsertTaxRates = Omit<TaxRates, "id" | "createdAt" | "updatedAt">;

// ─── Tax Profile ───────────────────────────────────────────────────────────

export interface TaxProfile {
  id: string;
  userId: string;
  assessmentYear: string;
  salaryIncome?: number | null;
  otherIncome?: number | null;
  hraReceived?: number | null;
  rentPaid?: number | null;
  cityType?: string | null;
  section80C?: number | null;
  section80D?: number | null;
  section80E?: number | null;
  section80G?: number | null;
  homeLoanInterest?: number | null;
  capitalGainsShortTerm?: number | null;
  capitalGainsLongTerm?: number | null;
  cryptoIncome?: number | null;
  businessIncome?: number | null;
  totalTaxOldRegime?: number | null;
  totalTaxNewRegime?: number | null;
  recommendedRegime?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type InsertTaxProfile = Omit<TaxProfile, "id" | "createdAt" | "updatedAt">;

// ─── Crypto Transaction ────────────────────────────────────────────────────

export interface CryptoTransaction {
  id: string;
  userId: string;
  taxProfileId?: string | null;
  cryptocurrency: string;
  transactionType: string;
  amount: number;
  priceInr: number;
  transactionDate: Date | string;
  exchangeName?: string | null;
  notes?: string | null;
  createdAt?: Date | string;
}

export type InsertCryptoTransaction = Omit<CryptoTransaction, "id" | "createdAt">;

// ─── Mutual Fund ───────────────────────────────────────────────────────────

export const insertMutualFundSchema = z.object({
  schemeCode: z.string(),
  schemeName: z.string(),
  nav: z.number().optional().nullable(),
  category: optStr,
  fundHouse: optStr,
  navDate: optStr,
});

export type MutualFund = z.infer<typeof insertMutualFundSchema> & { id: string };
export type InsertMutualFund = z.infer<typeof insertMutualFundSchema>;

// ─── Market Data ───────────────────────────────────────────────────────────

export const insertMarketDataSchema = z.object({
  symbol: z.string(),
  name: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  change: z.number().optional().nullable(),
  changePercent: z.number().optional().nullable(),
  volume: z.number().optional().nullable(),
  marketCap: z.number().optional().nullable(),
  dataType: optStr,
  updatedAt: z.any().optional(),
});

export type MarketData = z.infer<typeof insertMarketDataSchema> & { id: string };
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;

// ─── News Article ──────────────────────────────────────────────────────────

export const insertNewsArticleSchema = z.object({
  title: z.string(),
  content: z.string().optional().nullable(),
  summary: optStr,
  url: optStr,
  imageUrl: optStr,
  source: optStr,
  category: optStr,
  publishedAt: z.any().optional(),
});

export type NewsArticle = z.infer<typeof insertNewsArticleSchema> & { id: string };
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;

// ─── IPO Data ──────────────────────────────────────────────────────────────

export const insertIPODataSchema = z.object({
  companyName: z.string(),
  issuePrice: z.number().optional().nullable(),
  lotSize: optNum,
  openDate: optStr,
  closeDate: optStr,
  listingDate: optStr,
  status: optStr,
  exchange: optStr,
  issueSize: optStr,
  subscriptionStatus: optStr,
});

export type IPOData = z.infer<typeof insertIPODataSchema> & { id: string };
export type InsertIPOData = z.infer<typeof insertIPODataSchema>;

// ─── Tax Document ──────────────────────────────────────────────────────────

export const insertTaxDocumentSchema = z.object({
  userId: z.string(),
  documentType: z.string(),
  fileName: z.string(),
  filePath: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  mimeType: optStr,
  assessmentYear: optStr,
  processingStatus: optStr,
  firebaseFileId: optStr,
  downloadUrl: optStr,
  expiresAt: z.date().optional().nullable(),
  // Processing result flags (set by async pipeline after initial insert)
  isProcessed: z.boolean().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  // Extracted data as JSON string (set after successful processing)
  extractedData: z.string().optional().nullable(),
});

export type TaxDocument = z.infer<typeof insertTaxDocumentSchema> & {
  id: string;
  uploadedAt?: Date | string;
  updatedAt?: Date | string;
  // Processing status flags (set by async processing pipeline)
  isProcessed?: boolean | null;
  errorMessage?: string | null;
};
export type InsertTaxDocument = z.infer<typeof insertTaxDocumentSchema>;

// ─── Extracted Tax Data ────────────────────────────────────────────────────

export const insertExtractedTaxDataSchema = z.object({
  userId: z.string(),
  documentId: z.string(),
  documentType: optStr,
  assessmentYear: optStr,
  grossSalary: optNum,
  netSalary: optNum,
  tdsDeducted: optNum,
  deductions: z.record(z.any()).optional().nullable(),
  rawData: z.record(z.any()).optional().nullable(),
  confidence: optNum,
});

export type ExtractedTaxData = z.infer<typeof insertExtractedTaxDataSchema> & {
  id: string;
  extractedAt?: Date | string;
};
export type InsertExtractedTaxData = z.infer<typeof insertExtractedTaxDataSchema>;

// ─── Tax Calculation History ───────────────────────────────────────────────

export interface TaxCalculationHistory {
  id: string;
  userId: string;
  assessmentYear?: string | null;
  inputData?: Record<string, any> | null;
  oldRegimeResult?: Record<string, any> | null;
  newRegimeResult?: Record<string, any> | null;
  savings?: number | null;
  recommendedRegime?: string | null;
  calculatedAt?: Date | string;
  expiresAt?: Date | string;
}

export type InsertTaxCalculationHistory = Omit<TaxCalculationHistory, "id" | "calculatedAt">;

// ─── Contact Inquiry ───────────────────────────────────────────────────────

export const contactInquirySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

export type ContactInquiry = z.infer<typeof contactInquirySchema>;

// ─── Accounting — Firm ─────────────────────────────────────────────────────

export const insertFirmSchema = z.object({
  userId: z.string(),
  firmName: z.string().min(1, "Firm name is required"),
  gstin: optStr,
  pan: optStr,
  address: optStr,
  city: optStr,
  state: optStr,
  pincode: optStr,
  phone: optStr,
  email: z.string().email().optional().nullable(),
  bankName: optStr,
  bankAccountNo: optStr,
  bankIfsc: optStr,
  logoUrl: optStr,
  signatureUrl: optStr,
  defaultTaxType: z.enum(["gst", "non-gst"]).optional().default("gst"),
});

export type Firm = z.infer<typeof insertFirmSchema> & {
  id: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
export type InsertFirm = z.infer<typeof insertFirmSchema>;

// ─── Accounting — Client ───────────────────────────────────────────────────

export const insertClientSchema = z.object({
  firmId: z.string(),
  userId: z.string().optional(),
  clientName: z.string().min(1, "Client name is required"),
  gstin: optStr,
  pan: optStr,
  address: optStr,
  city: optStr,
  state: optStr,
  pincode: optStr,
  phone: optStr,
  email: z.string().email().optional().nullable(),
  clientType: z.enum(["business", "individual"]).optional().default("business"),
});

export type Client = z.infer<typeof insertClientSchema> & {
  id: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
export type InsertClient = z.infer<typeof insertClientSchema>;

// ─── Accounting — Invoice ──────────────────────────────────────────────────

export const insertInvoiceSchema = z.object({
  userId: z.string(),
  firmId: z.string(),
  clientId: z.string(),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  dueDate: optStr,
  taxType: z.enum(["gst", "non-gst"]).optional().default("gst"),
  supplyType: z.enum(["intrastate", "interstate"]).optional().default("intrastate"),
  subtotal: z.string().or(z.number()).optional(),
  cgst: z.string().or(z.number()).optional(),
  sgst: z.string().or(z.number()).optional(),
  igst: z.string().or(z.number()).optional(),
  totalTax: z.string().or(z.number()).optional(),
  grandTotal: z.string().or(z.number()).optional(),
  discount: z.string().or(z.number()).optional(),
  paymentStatus: z.enum(["unpaid", "paid", "partial"]).optional().default("unpaid"),
  paymentDate: optStr,
  notes: optStr,
  termsAndConditions: optStr,
});

export type Invoice = z.infer<typeof insertInvoiceSchema> & {
  id: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// ─── Accounting — Invoice Item ─────────────────────────────────────────────

export const insertInvoiceItemSchema = z.object({
  invoiceId: z.string(),
  itemDescription: z.string().min(1, "Item description is required"),
  hsnCode: optStr,
  quantity: z.number().or(z.string()),
  unit: optStr,
  rate: z.number().or(z.string()),
  gstRate: z.number().or(z.string()).optional(),
  amount: z.number().or(z.string()).optional(),
  taxAmount: z.number().or(z.string()).optional(),
  totalAmount: z.number().or(z.string()).optional(),
});

export type InvoiceItem = z.infer<typeof insertInvoiceItemSchema> & { id: string };
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

// ─── Accounting — Sales Register ───────────────────────────────────────────

export interface SalesRegister {
  id: string;
  firmId: string;
  userId?: string | null;
  month: string;
  year?: number | null;
  totalSales?: number | string | null;
  totalTax?: number | string | null;
  totalInvoices?: number | null;
  // GST-breakdown fields (stored as strings to preserve decimal precision)
  totalCgst?: number | string | null;
  totalSgst?: number | string | null;
  totalIgst?: number | string | null;
  grandTotal?: number | string | null;
  invoiceIds?: string[] | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type InsertSalesRegister = Omit<SalesRegister, "id" | "createdAt" | "updatedAt">;

// ─── Accounting — Purchase Register ───────────────────────────────────────

export interface PurchaseRegister {
  id: string;
  firmId: string;
  userId?: string | null;
  month: string;
  year?: number | null;
  totalPurchases?: number | null;
  totalTax?: number | null;
  totalEntries?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type InsertPurchaseRegister = Omit<PurchaseRegister, "id" | "createdAt" | "updatedAt">;

// ─── CA Profile (Chartered Accountant Act compliant) ───────────────────────
// Factual directory listing only. No ratings, no rankings, no testimonials.
// Platform is a technology introduction service, not a tax practice.

export const CA_PRACTICE_AREAS = [
  "itr_filing",
  "tax_planning",
  "nri_taxation",
  "capital_gains",
  "gst",
  "business_tax",
  "salary_income",
  "freelancer_tax",
  "startup_advisory",
  "international_tax",
] as const;

export type CAPracticeArea = typeof CA_PRACTICE_AREAS[number];

export const CA_PRACTICE_AREA_LABELS: Record<CAPracticeArea, string> = {
  itr_filing: "ITR Filing",
  tax_planning: "Tax Planning",
  nri_taxation: "NRI Taxation",
  capital_gains: "Capital Gains",
  gst: "GST",
  business_tax: "Business Tax",
  salary_income: "Salary Income",
  freelancer_tax: "Freelancer Tax",
  startup_advisory: "Startup Advisory",
  international_tax: "International Tax",
};

export interface CAProfile {
  id: string;
  icaiMembershipNumber: string;    // e.g. "123456"
  fullName: string;                // As per ICAI records
  firmName?: string | null;
  city: string;
  state: string;
  practiceAreas: CAPracticeArea[];
  languages: string[];
  yearsOfPractice: number;
  email: string;                   // Shown publicly for contact
  whatsappNumber?: string | null;  // Shown as wa.me link if provided
  bio?: string | null;
  status: "pending" | "approved" | "rejected";
  rejectedReason?: string | null;
  createdAt?: Date | string;
  approvedAt?: Date | string;
}

export type InsertCAProfile = Omit<CAProfile, "id" | "createdAt" | "approvedAt" | "status" | "rejectedReason">;

export const insertCAProfileSchema = z.object({
  icaiMembershipNumber: z.string().min(4, "Valid ICAI membership number required").max(10),
  fullName: z.string().min(2, "Full name required").max(100),
  firmName: optStr,
  city: z.string().min(2, "City required"),
  state: z.string().min(2, "State required"),
  practiceAreas: z.array(z.enum(CA_PRACTICE_AREAS)).min(1, "Select at least one area"),
  languages: z.array(z.string()).min(1, "Select at least one language"),
  yearsOfPractice: z.number().min(0).max(60),
  email: z.string().email("Valid email required"),
  whatsappNumber: optStr,
  bio: z.string().max(2000, "Bio must be under 2000 characters").optional().nullable(),
  agreeToEthics: z.literal(true, { errorMap: () => ({ message: "You must confirm compliance with ICAI Code of Ethics" }) }),
});

// ─── CA Contact Request ────────────────────────────────────────────────────

export interface CAContactRequest {
  id: string;
  caId: string;
  caName: string;
  caEmail: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  taxIssue: string;
  createdAt?: Date | string;
}

export type InsertCAContactRequest = Omit<CAContactRequest, "id" | "createdAt">;

export const insertCAContactRequestSchema = z.object({
  caId: z.string().min(1),
  caName: z.string().min(1),
  caEmail: z.string().email(),
  userName: z.string().min(1, "Your name is required"),
  userEmail: z.string().email("Valid email required"),
  userPhone: optStr,
  taxIssue: z.string().min(10, "Please describe your tax issue (min 10 chars)").max(500),
});

// ─── Lead Capture ──────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  name: string;
  email: string;
  whatsapp?: string | null;
  source: string;           // e.g. "Income Tax Calculator", "HRA Calculator"
  summaryText?: string | null; // e.g. "Tax: ₹42,000 | New Regime | Income: ₹8L"
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  // DPDP: granular consent captured at the point of collection. dataConsent
  // covers the one-time computation email this lead was captured for;
  // marketingConsent is a separate opt-in for any future/recurring tax tips
  // — required to be false unless the user actively checked it.
  dataConsent?: boolean;
  marketingConsent?: boolean;
  createdAt?: Date | string;
}

export type InsertLead = Omit<Lead, "id" | "createdAt">;

export const insertLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  whatsapp: optStr,
  source: z.string().min(1),
  summaryText: optStr,
  utmSource: optStr,
  utmMedium: optStr,
  utmCampaign: optStr,
  dataConsent: z.boolean().refine((v) => v === true, {
    message: "You must agree to the Privacy Policy to continue.",
  }),
  marketingConsent: z.boolean().optional().default(false),
});
