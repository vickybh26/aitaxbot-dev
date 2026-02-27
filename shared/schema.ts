import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Updated users table with extended profile fields
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  mobile: varchar("mobile", { length: 15 }),
  gender: varchar("gender", { length: 10 }), // male, female, other
  occupation: varchar("occupation", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  authProvider: varchar("auth_provider", { length: 20 }), // google, email, mobile
  isProfileComplete: boolean("is_profile_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Profile Change Log - tracks all profile modifications
export const userProfileLogs = pgTable("user_profile_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fieldChanged: varchar("field_changed").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedAt: timestamp("changed_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

// Tax Rates table - stores tax slabs for different years and regimes
export const taxRates = pgTable("tax_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentYear: varchar("assessment_year").notNull(), // e.g., "2025-26", "2026-27", "2027-28"
  financialYear: varchar("financial_year").notNull(), // e.g., "2024-25", "2025-26", "2026-27"
  regime: varchar("regime").notNull(), // "old" or "new"
  ageGroup: varchar("age_group").notNull(), // "below60", "60to80", "above80"
  
  // Tax slabs stored as JSON array
  slabs: jsonb("slabs").notNull(), // [{min: 0, max: 300000, rate: 0}, {min: 300000, max: 700000, rate: 5}, ...]
  
  // Standard deduction and rebate limits
  standardDeduction: decimal("standard_deduction", { precision: 12, scale: 2 }).default("75000"),
  rebateLimit: decimal("rebate_limit", { precision: 12, scale: 2 }).default("700000"), // Section 87A
  maxRebate: decimal("max_rebate", { precision: 12, scale: 2 }).default("25000"),
  
  // Surcharge thresholds (stored as JSON)
  surchargeSlabs: jsonb("surcharge_slabs"), // [{min: 5000000, max: 10000000, rate: 10}, ...]
  
  // Health and Education Cess rate
  cessRate: decimal("cess_rate", { precision: 5, scale: 2 }).default("4"),
  
  // Act reference
  actReference: varchar("act_reference", { length: 50 }), // "Income Tax Act, 1961" or "Income Tax Act, 2025"
  effectiveFrom: timestamp("effective_from"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax profiles for storing Indian tax filing data
export const taxProfiles = pgTable("tax_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assessmentYear: varchar("assessment_year").notNull(), // e.g., "2024-25"
  financialYear: varchar("financial_year").notNull(), // e.g., "2023-24"
  taxRegime: varchar("tax_regime").notNull(), // "old" or "new"
  panNumber: varchar("pan_number"),
  
  // Income details
  salaryIncome: decimal("salary_income", { precision: 15, scale: 2 }).default("0"),
  housePropertyIncome: decimal("house_property_income", { precision: 15, scale: 2 }).default("0"),
  businessIncome: decimal("business_income", { precision: 15, scale: 2 }).default("0"),
  capitalGainsIncome: decimal("capital_gains_income", { precision: 15, scale: 2 }).default("0"),
  otherIncome: decimal("other_income", { precision: 15, scale: 2 }).default("0"),
  cryptoIncome: decimal("crypto_income", { precision: 15, scale: 2 }).default("0"), // Section 115BBH
  
  // Deductions under old regime
  section80C: decimal("section_80c", { precision: 15, scale: 2 }).default("0"),
  section80D: decimal("section_80d", { precision: 15, scale: 2 }).default("0"),
  section80G: decimal("section_80g", { precision: 15, scale: 2 }).default("0"),
  section80E: decimal("section_80e", { precision: 15, scale: 2 }).default("0"),
  
  // HRA details
  hraReceived: decimal("hra_received", { precision: 15, scale: 2 }).default("0"),
  hraExemption: decimal("hra_exemption", { precision: 15, scale: 2 }).default("0"),
  rentPaid: decimal("rent_paid", { precision: 15, scale: 2 }).default("0"),
  isMetroCity: boolean("is_metro_city").default(false),
  
  // Crypto tax details
  cryptoTdsDeducted: decimal("crypto_tds_deducted", { precision: 15, scale: 2 }).default("0"), // Section 194S
  
  // Tax calculation results
  taxableIncome: decimal("taxable_income", { precision: 15, scale: 2 }).default("0"),
  taxLiability: decimal("tax_liability", { precision: 15, scale: 2 }).default("0"),
  
  // Form 16 data
  form16Data: jsonb("form16_data"), // Store extracted Form 16 data
  aisData: jsonb("ais_data"), // Store AIS data
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Crypto transactions table for detailed tracking
export const cryptoTransactions = pgTable("crypto_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taxProfileId: varchar("tax_profile_id").references(() => taxProfiles.id, { onDelete: "cascade" }),
  transactionType: varchar("transaction_type").notNull(), // "buy", "sell", "transfer"
  cryptocurrency: varchar("cryptocurrency").notNull(), // "BTC", "ETH", etc.
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  priceInr: decimal("price_inr", { precision: 15, scale: 2 }).notNull(),
  totalValueInr: decimal("total_value_inr", { precision: 15, scale: 2 }).notNull(),
  exchange: varchar("exchange"), // "WazirX", "CoinDCX", etc.
  transactionDate: timestamp("transaction_date").notNull(),
  tdsDeducted: decimal("tds_deducted", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mutualFunds = pgTable("mutual_funds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schemeCode: text("scheme_code").notNull().unique(),
  schemeName: text("scheme_name").notNull(),
  nav: decimal("nav", { precision: 10, scale: 4 }),
  date: text("date"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  change: decimal("change", { precision: 10, scale: 2 }),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }),
  volume: integer("volume"),
  marketCap: text("market_cap"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const newsArticles = pgTable("news_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary"),
  url: text("url"),
  source: text("source"),
  publishedAt: timestamp("published_at"),
  category: text("category"),
  sentiment: text("sentiment"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ipoData = pgTable("ipo_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  issuePrice: text("issue_price"),
  issueSize: text("issue_size"),
  listingDate: text("listing_date"),
  status: text("status"),
  gmp: decimal("gmp", { precision: 10, scale: 2 }),
  subscriptionStatus: text("subscription_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tax Document Upload Schema - Firebase Storage Integration
export const taxDocuments = pgTable("tax_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  documentType: text("document_type").notNull(), // 'form16', 'ais', '26as'
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  firebaseFileId: varchar("firebase_file_id"), // Firebase file ID for cleanup
  downloadUrl: text("download_url"), // Firebase signed URL
  fileSize: integer("file_size"),
  expiresAt: timestamp("expires_at"), // When file expires in Firebase
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  isProcessed: boolean("is_processed").default(false),
  processingStatus: text("processing_status").default('pending'), // 'pending', 'processing', 'completed', 'error'
  extractedData: text("extracted_data"), // JSON string of extracted tax data
  errorMessage: text("error_message"),
});

// Extracted Tax Data Schema
export const extractedTaxData = pgTable("extracted_tax_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  userId: varchar("user_id").notNull(),
  assessmentYear: text("assessment_year"),
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }),
  standardDeduction: decimal("standard_deduction", { precision: 12, scale: 2 }),
  exemptions: decimal("exemptions", { precision: 12, scale: 2 }),
  deductions80C: decimal("deductions_80c", { precision: 12, scale: 2 }),
  deductions80D: decimal("deductions_80d", { precision: 12, scale: 2 }),
  otherDeductions: decimal("other_deductions", { precision: 12, scale: 2 }),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }),
  taxableIncome: decimal("taxable_income", { precision: 12, scale: 2 }),
  taxLiability: decimal("tax_liability", { precision: 12, scale: 2 }),
  tdsDeducted: decimal("tds_deducted", { precision: 12, scale: 2 }),
  refundDue: decimal("refund_due", { precision: 12, scale: 2 }),
  employerName: text("employer_name"),
  employerPAN: text("employer_pan"),
  employerTAN: text("employer_tan"),
  employeePAN: text("employee_pan"),
  extractedAt: timestamp("extracted_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  taxProfiles: many(taxProfiles),
  taxDocuments: many(taxDocuments),
  cryptoTransactions: many(cryptoTransactions),
}));

export const taxProfilesRelations = relations(taxProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [taxProfiles.userId],
    references: [users.id],
  }),
  cryptoTransactions: many(cryptoTransactions),
}));

export const cryptoTransactionsRelations = relations(cryptoTransactions, ({ one }) => ({
  user: one(users, {
    fields: [cryptoTransactions.userId],
    references: [users.id],
  }),
  taxProfile: one(taxProfiles, {
    fields: [cryptoTransactions.taxProfileId],
    references: [taxProfiles.id],
  }),
}));

// Replit Auth types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User Profile Log types
export const insertUserProfileLogSchema = createInsertSchema(userProfileLogs).omit({
  id: true,
  changedAt: true,
});
export type InsertUserProfileLog = z.infer<typeof insertUserProfileLogSchema>;
export type UserProfileLog = typeof userProfileLogs.$inferSelect;

// Tax Rates types
export const insertTaxRatesSchema = createInsertSchema(taxRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTaxRates = z.infer<typeof insertTaxRatesSchema>;
export type TaxRates = typeof taxRates.$inferSelect;

// Tax Slab interface for type safety
export interface TaxSlab {
  min: number;
  max: number | null; // null for "and above"
  rate: number; // percentage
}

export interface SurchargeSlab {
  min: number;
  max: number | null;
  rate: number;
}

export const insertTaxProfileSchema = createInsertSchema(taxProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTaxProfile = z.infer<typeof insertTaxProfileSchema>;
export type TaxProfile = typeof taxProfiles.$inferSelect;

export const insertCryptoTransactionSchema = createInsertSchema(cryptoTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertCryptoTransaction = z.infer<typeof insertCryptoTransactionSchema>;
export type CryptoTransaction = typeof cryptoTransactions.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
});

export const insertMutualFundSchema = createInsertSchema(mutualFunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  updatedAt: true,
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  createdAt: true,
});

export const insertIPODataSchema = createInsertSchema(ipoData).omit({
  id: true,
  createdAt: true,
});

export const insertTaxDocumentSchema = createInsertSchema(taxDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertExtractedTaxDataSchema = createInsertSchema(extractedTaxData).omit({
  id: true,
  extractedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type MutualFund = typeof mutualFunds.$inferSelect;
export type InsertMutualFund = z.infer<typeof insertMutualFundSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type IPOData = typeof ipoData.$inferSelect;
export type InsertIPOData = z.infer<typeof insertIPODataSchema>;
export type TaxDocument = typeof taxDocuments.$inferSelect;
export type InsertTaxDocument = z.infer<typeof insertTaxDocumentSchema>;
export type ExtractedTaxData = typeof extractedTaxData.$inferSelect;
export type InsertExtractedTaxData = z.infer<typeof insertExtractedTaxDataSchema>;

// ==========================================
// TAX CALCULATION HISTORY SCHEMA
// ==========================================

export const taxCalculationHistory = pgTable("tax_calculation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  financialYear: varchar("financial_year").notNull(),
  assessmentYear: varchar("assessment_year").notNull(),
  ageGroup: varchar("age_group").notNull(),
  
  inputData: jsonb("input_data").notNull(),
  
  oldRegimeResult: jsonb("old_regime_result").notNull(),
  newRegimeResult: jsonb("new_regime_result").notNull(),
  recommendedRegime: varchar("recommended_regime").notNull(),
  savings: decimal("savings", { precision: 15, scale: 2 }).notNull(),
  
  grossIncome: decimal("gross_income", { precision: 15, scale: 2 }).notNull(),
  taxableIncomeOld: decimal("taxable_income_old", { precision: 15, scale: 2 }).notNull(),
  taxableIncomeNew: decimal("taxable_income_new", { precision: 15, scale: 2 }).notNull(),
  totalTaxOld: decimal("total_tax_old", { precision: 15, scale: 2 }).notNull(),
  totalTaxNew: decimal("total_tax_new", { precision: 15, scale: 2 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertTaxCalculationHistorySchema = createInsertSchema(taxCalculationHistory).omit({
  id: true,
  createdAt: true,
});

export type TaxCalculationHistory = typeof taxCalculationHistory.$inferSelect;
export type InsertTaxCalculationHistory = z.infer<typeof insertTaxCalculationHistorySchema>;

// ==========================================
// ACCOUNTING MODULE SCHEMA
// ==========================================

// Firms/Companies table - allows users to manage multiple firms
export const firms = pgTable("firms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firmName: text("firm_name").notNull(),
  isGstRegistered: boolean("is_gst_registered").default(false).notNull(),
  gstin: varchar("gstin", { length: 15 }), // GST Identification Number
  pan: varchar("pan", { length: 10 }),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: varchar("pincode", { length: 6 }),
  email: varchar("email"),
  phone: varchar("phone"),
  logoUrl: text("logo_url"), // Firebase or uploaded logo
  bankName: text("bank_name"),
  bankAccountNumber: varchar("bank_account_number"),
  bankIfsc: varchar("bank_ifsc", { length: 11 }),
  bankBranch: text("bank_branch"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table - firm-specific clients
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firmId: varchar("firm_id").notNull().references(() => firms.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  gstin: varchar("gstin", { length: 15 }),
  pan: varchar("pan", { length: 10 }),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: varchar("pincode", { length: 6 }),
  email: varchar("email"),
  phone: varchar("phone"),
  billingAddress: text("billing_address"), // Separate billing address if different
  shippingAddress: text("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table - GST and Non-GST invoices with complete details
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firmId: varchar("firm_id").notNull().references(() => firms.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  isGstInvoice: boolean("is_gst_invoice").default(true).notNull(),
  
  // Invoice totals
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  cgst: decimal("cgst", { precision: 15, scale: 2 }).notNull().default("0"),
  sgst: decimal("sgst", { precision: 15, scale: 2 }).notNull().default("0"),
  igst: decimal("igst", { precision: 15, scale: 2 }).notNull().default("0"),
  totalTax: decimal("total_tax", { precision: 15, scale: 2 }).notNull().default("0"),
  grandTotal: decimal("grand_total", { precision: 15, scale: 2 }).notNull().default("0"),
  
  // Payment details
  paymentStatus: varchar("payment_status").notNull().default("unpaid"), // unpaid, partial, paid
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  paymentMode: varchar("payment_mode"), // cash, cheque, upi, bank_transfer
  
  // Additional fields
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  placeOfSupply: varchar("place_of_supply"), // State for GST calculation
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice items/line items
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  itemDescription: text("item_description").notNull(),
  hsnSac: varchar("hsn_sac"), // HSN code for goods or SAC for services
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit").default("nos"), // nos, kg, meter, hours, etc.
  rate: decimal("rate", { precision: 15, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(), // 5, 12, 18, 28
  cgstAmount: decimal("cgst_amount", { precision: 15, scale: 2 }).default("0"),
  sgstAmount: decimal("sgst_amount", { precision: 15, scale: 2 }).default("0"),
  igstAmount: decimal("igst_amount", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales Register - monthly summary
export const salesRegister = pgTable("sales_register", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firmId: varchar("firm_id").notNull().references(() => firms.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: varchar("month").notNull(), // Format: "2025-10" (YYYY-MM)
  year: integer("year").notNull(),
  
  // Summary totals
  totalInvoices: integer("total_invoices").notNull().default(0),
  totalSales: decimal("total_sales", { precision: 15, scale: 2 }).notNull().default("0"),
  totalCgst: decimal("total_cgst", { precision: 15, scale: 2 }).notNull().default("0"),
  totalSgst: decimal("total_sgst", { precision: 15, scale: 2 }).notNull().default("0"),
  totalIgst: decimal("total_igst", { precision: 15, scale: 2 }).notNull().default("0"),
  totalTax: decimal("total_tax", { precision: 15, scale: 2 }).notNull().default("0"),
  grandTotal: decimal("grand_total", { precision: 15, scale: 2 }).notNull().default("0"),
  
  // Detailed invoice references
  invoiceIds: text("invoice_ids").array(), // Array of invoice IDs for this month
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
  (table) => [
    index("sales_register_firm_month_idx").on(table.firmId, table.month),
  ]
);

// Relations for accounting module
export const firmsRelations = relations(firms, ({ one, many }) => ({
  user: one(users, {
    fields: [firms.userId],
    references: [users.id],
  }),
  clients: many(clients),
  invoices: many(invoices),
  salesRegisters: many(salesRegister),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  firm: one(firms, {
    fields: [clients.firmId],
    references: [firms.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  firm: one(firms, {
    fields: [invoices.firmId],
    references: [firms.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const salesRegisterRelations = relations(salesRegister, ({ one }) => ({
  user: one(users, {
    fields: [salesRegister.userId],
    references: [users.id],
  }),
  firm: one(firms, {
    fields: [salesRegister.firmId],
    references: [firms.id],
  }),
}));

// Zod schemas and types for accounting module
export const insertFirmSchema = createInsertSchema(firms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFirm = z.infer<typeof insertFirmSchema>;
export type Firm = typeof firms.$inferSelect;

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
});
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

export const insertSalesRegisterSchema = createInsertSchema(salesRegister).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSalesRegister = z.infer<typeof insertSalesRegisterSchema>;
export type SalesRegister = typeof salesRegister.$inferSelect;

// Purchase Register table for tracking purchases
export const purchaseRegister = pgTable("purchase_register", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firmId: varchar("firm_id").notNull().references(() => firms.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: varchar("month").notNull(), // Format: "2025-10" (YYYY-MM)
  year: integer("year").notNull(),
  
  // Summary totals
  totalPurchases: integer("total_purchases").notNull().default(0),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalCgst: decimal("total_cgst", { precision: 15, scale: 2 }).notNull().default("0"),
  totalSgst: decimal("total_sgst", { precision: 15, scale: 2 }).notNull().default("0"),
  totalIgst: decimal("total_igst", { precision: 15, scale: 2 }).notNull().default("0"),
  totalTax: decimal("total_tax", { precision: 15, scale: 2 }).notNull().default("0"),
  grandTotal: decimal("grand_total", { precision: 15, scale: 2 }).notNull().default("0"),
  
  // Detailed purchase entries
  purchases: jsonb("purchases"), // Array of purchase entries
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
  (table) => [
    index("purchase_register_firm_month_idx").on(table.firmId, table.month),
  ]
);

export const insertPurchaseRegisterSchema = createInsertSchema(purchaseRegister);
export type InsertPurchaseRegister = z.infer<typeof insertPurchaseRegisterSchema>;
export type PurchaseRegister = typeof purchaseRegister.$inferSelect;

// ==========================================
// CONTACT INQUIRY SCHEMA (Firebase Firestore)
// ==========================================

// Contact inquiry validation schema (for Firebase Firestore)
export const contactInquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export type ContactInquiry = z.infer<typeof contactInquirySchema>;
