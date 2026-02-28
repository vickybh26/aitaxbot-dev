import PDFDocument from "pdfkit";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// @ts-ignore - pdfkit types are available

interface EmployerDetails {
  name: string;
  tan?: string;
  address?: string;
  natureOfEmployment?: string;
}

interface SalaryBreakdown {
  basicSalary?: number;
  hra?: number;
  specialAllowance?: number;
  lta?: number;
  otherAllowances?: number;
  bonus?: number;
  perquisites?: number;
  grossSalary: number;
  standardDeduction: number;
  netSalary: number;
}

interface Deductions {
  section80C?: number;
  section80D?: number;
  section80G?: number;
  section80E?: number;
  section80TTA?: number;
  nps80CCD1B?: number;
  homeLoanInterest?: number;
  otherDeductions?: number;
  totalDeductions: number;
}

interface TaxBreakdown {
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
}

interface OtherIncome {
  interestIncome?: number;
  dividendIncome?: number;
  rentalIncome?: number;
  capitalGains?: {
    shortTerm?: number;
    longTerm?: number;
  };
  otherSources?: number;
  total: number;
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
  regime: "old" | "new";
  employer?: EmployerDetails;
  salary?: SalaryBreakdown;
  otherIncome?: OtherIncome;
  deductions?: Deductions;
  taxBreakdown: TaxBreakdown;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  computationDate: Date;
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("en-IN").format(amount);
}

export function generateTaxComputationPDF(data: TaxComputationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ 
      margin: 50, 
      size: "A4",
      info: {
        Title: `Income Tax Computation - ${data.assessmentYear}`,
        Author: "AiTaxBot",
        Subject: "Income Tax Computation Statement",
      }
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100;
    let y = 40;

    // Header with AiTaxBot branding
    doc.fontSize(22).font("Helvetica-Bold")
       .fillColor("#1E40AF")
       .text("AiTaxBot", { align: "center" });
    y += 30;
    
    doc.fontSize(10).font("Helvetica")
       .fillColor("#666666")
       .text("www.aitaxbot.co.in | AI-Powered Tax Calculator & Financial Tools", { align: "center" });
    y += 25;
    
    // Divider line - with proper spacing
    y += 10;
    doc.moveTo(50, y).lineTo(545, y).strokeColor("#1E40AF").lineWidth(2).stroke();
    y += 30;
    
    doc.fillColor("#000000").lineWidth(1);
    
    doc.fontSize(14).font("Helvetica-Bold")
       .text(`INCOME TAX COMPUTATION STATEMENT`, { align: "center" });
    y += 30;
    
    doc.fontSize(12).font("Helvetica-Bold")
       .text(`Assessment Year: ${data.assessmentYear}`, { align: "center" });
    y += 40;

    doc.fontSize(10).font("Helvetica");
    
    const leftCol = 50;
    const rightCol = 350;
    
    doc.text(`Name`, leftCol, y);
    doc.text(`: ${data.personalInfo.name}`, leftCol + 100, y);
    doc.text(`Previous Year`, rightCol, y);
    doc.text(`: ${data.financialYear}`, rightCol + 100, y);
    y += 15;

    if (data.personalInfo.fatherName) {
      doc.text(`Father's Name`, leftCol, y);
      doc.text(`: ${data.personalInfo.fatherName}`, leftCol + 100, y);
    }
    if (data.personalInfo.pan) {
      doc.text(`PAN`, rightCol, y);
      doc.text(`: ${data.personalInfo.pan}`, rightCol + 100, y);
    }
    y += 15;

    if (data.personalInfo.address) {
      doc.text(`Address`, leftCol, y);
      doc.text(`: ${data.personalInfo.address.substring(0, 40)}`, leftCol + 100, y);
    }
    if (data.personalInfo.aadhaar) {
      doc.text(`Aadhaar No.`, rightCol, y);
      doc.text(`: ${data.personalInfo.aadhaar}`, rightCol + 100, y);
    }
    y += 15;

    if (data.personalInfo.dateOfBirth) {
      doc.text(`Date of Birth`, rightCol, y);
      doc.text(`: ${data.personalInfo.dateOfBirth}`, rightCol + 100, y);
    }
    y += 15;

    doc.text(`Status`, rightCol, y);
    doc.text(`: ${data.personalInfo.status}`, rightCol + 100, y);
    y += 15;

    doc.text(`Age Group`, leftCol, y);
    doc.text(`: ${data.personalInfo.ageGroup === "below60" ? "Below 60" : data.personalInfo.ageGroup === "60to80" ? "60-80 (Senior)" : "Above 80 (Super Senior)"}`, leftCol + 100, y);
    
    doc.text(`Tax Regime`, rightCol, y);
    doc.text(`: ${data.regime === "new" ? "New Regime (115BAC)" : "Old Regime"}`, rightCol + 100, y);
    y += 30;

    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
    y += 10;

    doc.fontSize(12).font("Helvetica-Bold")
       .text("Statement of Income", leftCol, y, { align: "center", width: pageWidth });
    y += 25;

    doc.fontSize(10).font("Helvetica");

    const colSchedule = leftCol + pageWidth - 50;
    const colAmount = leftCol + pageWidth - 150;

    doc.font("Helvetica-Bold").text("Particulars", leftCol, y);
    doc.text("Sch.No", colSchedule, y);
    doc.text("Rs.", colAmount, y);
    y += 20;

    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
    y += 10;

    if (data.salary) {
      doc.font("Helvetica-Bold").text("▶ Income from Salaries", leftCol, y);
      y += 18;

      if (data.employer) {
        doc.font("Helvetica").fontSize(9)
           .text(`Employer: ${data.employer.name}`, leftCol + 10, y);
        y += 15;
      }

      if (data.salary.grossSalary) {
        doc.font("Helvetica").fontSize(10)
           .text("Salaries, allowances and perquisites", leftCol + 15, y);
        doc.text(formatNumber(data.salary.grossSalary), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      doc.text(`Standard deduction u/s 16(ia)`, leftCol + 15, y);
      doc.text(formatNumber(data.salary.standardDeduction), colAmount, y, { width: 80, align: "right" });
      y += 15;

      doc.font("Helvetica-Bold")
         .text('Income chargeable under the head "Salaries"', leftCol + 15, y);
      doc.text(formatNumber(data.salary.netSalary), colAmount, y, { width: 80, align: "right" });
      y += 25;
    }

    if (data.otherIncome && data.otherIncome.total > 0) {
      doc.font("Helvetica-Bold").text("▶ Income from Other Sources", leftCol, y);
      y += 18;

      if (data.otherIncome.interestIncome) {
        doc.font("Helvetica").text("Interest income", leftCol + 15, y);
        doc.text(formatNumber(data.otherIncome.interestIncome), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      if (data.otherIncome.dividendIncome) {
        doc.font("Helvetica").text("Dividends", leftCol + 15, y);
        doc.text(formatNumber(data.otherIncome.dividendIncome), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      if (data.otherIncome.rentalIncome) {
        doc.font("Helvetica").text("Rental income", leftCol + 15, y);
        doc.text(formatNumber(data.otherIncome.rentalIncome), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      doc.font("Helvetica-Bold")
         .text('Income chargeable under the head "Other Sources"', leftCol + 15, y);
      doc.text(formatNumber(data.otherIncome.total), colAmount, y, { width: 80, align: "right" });
      y += 25;
    }

    if (data.otherIncome?.capitalGains && 
        ((data.otherIncome.capitalGains.shortTerm || 0) + (data.otherIncome.capitalGains.longTerm || 0)) > 0) {
      doc.font("Helvetica-Bold").text("▶ Capital Gains", leftCol, y);
      y += 18;

      if (data.otherIncome.capitalGains.shortTerm) {
        doc.font("Helvetica").text("Short-term Capital Gains", leftCol + 15, y);
        doc.text(formatNumber(data.otherIncome.capitalGains.shortTerm), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      if (data.otherIncome.capitalGains.longTerm) {
        doc.font("Helvetica").text("Long-term Capital Gains", leftCol + 15, y);
        doc.text(formatNumber(data.otherIncome.capitalGains.longTerm), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      const totalCapGains = (data.otherIncome.capitalGains.shortTerm || 0) + (data.otherIncome.capitalGains.longTerm || 0);
      doc.font("Helvetica-Bold")
         .text('Income chargeable under the head "Capital Gains"', leftCol + 15, y);
      doc.text(formatNumber(totalCapGains), colAmount, y, { width: 80, align: "right" });
      y += 25;
    }

    if (data.deductions && data.deductions.totalDeductions > 0 && data.regime === "old") {
      doc.font("Helvetica-Bold").text("▶ Deductions under Chapter VI-A", leftCol, y);
      y += 18;

      if (data.deductions.section80C) {
        doc.font("Helvetica").text("Section 80C (PPF, ELSS, LIC, etc.)", leftCol + 15, y);
        doc.text(formatNumber(data.deductions.section80C), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      if (data.deductions.section80D) {
        doc.font("Helvetica").text("Section 80D (Health Insurance)", leftCol + 15, y);
        doc.text(formatNumber(data.deductions.section80D), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      if (data.deductions.nps80CCD1B) {
        doc.font("Helvetica").text("Section 80CCD(1B) (NPS)", leftCol + 15, y);
        doc.text(formatNumber(data.deductions.nps80CCD1B), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      if (data.deductions.section80TTA) {
        doc.font("Helvetica").text("Section 80TTA (Savings Interest)", leftCol + 15, y);
        doc.text(formatNumber(data.deductions.section80TTA), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      if (data.deductions.homeLoanInterest) {
        doc.font("Helvetica").text("Section 24(b) (Home Loan Interest)", leftCol + 15, y);
        doc.text(formatNumber(data.deductions.homeLoanInterest), colAmount, y, { width: 80, align: "right" });
        y += 15;
      }

      doc.font("Helvetica-Bold")
         .text("Total Deductions under Chapter VI-A", leftCol + 15, y);
      doc.text(formatNumber(data.deductions.totalDeductions), colAmount, y, { width: 80, align: "right" });
      y += 25;
    }

    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
    y += 10;

    doc.font("Helvetica-Bold").fontSize(11)
       .text("▶ Total Income", leftCol, y);
    doc.text(formatNumber(data.taxBreakdown.taxableIncome), colAmount, y, { width: 80, align: "right" });
    y += 20;

    doc.fontSize(10).text("Total income rounded off u/s 288A", leftCol + 15, y);
    const roundedIncome = Math.round(data.taxBreakdown.taxableIncome / 10) * 10;
    doc.text(formatNumber(roundedIncome), colAmount, y, { width: 80, align: "right" });
    y += 25;

    doc.font("Helvetica-Bold").fontSize(12)
       .text("Tax Computation", leftCol, y, { align: "center", width: pageWidth });
    y += 20;

    doc.fontSize(10).font("Helvetica");

    doc.text("▶ Tax on total income", leftCol, y);
    doc.text(formatNumber(data.taxBreakdown.taxOnIncome), colAmount, y, { width: 80, align: "right" });
    y += 15;

    if (data.taxBreakdown.surcharge > 0) {
      doc.text("Add: Surcharge", leftCol + 15, y);
      doc.text(formatNumber(data.taxBreakdown.surcharge), colAmount, y, { width: 80, align: "right" });
      y += 15;
    }

    doc.text("Add: Health & Education Cess (4%)", leftCol + 15, y);
    doc.text(formatNumber(data.taxBreakdown.cess), colAmount, y, { width: 80, align: "right" });
    y += 15;

    doc.font("Helvetica-Bold")
       .text("Total Tax Liability", leftCol + 15, y);
    doc.text(formatNumber(data.taxBreakdown.totalTax), colAmount, y, { width: 80, align: "right" });
    y += 20;

    if (data.taxBreakdown.tdsDeducted) {
      doc.font("Helvetica").text("Less: TDS / TCS Deducted", leftCol + 15, y);
      doc.text(formatNumber(data.taxBreakdown.tdsDeducted), colAmount, y, { width: 80, align: "right" });
      y += 15;
    }

    if (data.taxBreakdown.advanceTaxPaid) {
      doc.text("Less: Advance Tax Paid", leftCol + 15, y);
      doc.text(formatNumber(data.taxBreakdown.advanceTaxPaid), colAmount, y, { width: 80, align: "right" });
      y += 15;
    }

    if (data.taxBreakdown.selfAssessmentTax) {
      doc.text("Less: Self Assessment Tax", leftCol + 15, y);
      doc.text(formatNumber(data.taxBreakdown.selfAssessmentTax), colAmount, y, { width: 80, align: "right" });
      y += 15;
    }

    y += 5;
    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
    y += 10;

    if (data.taxBreakdown.refundDue && data.taxBreakdown.refundDue > 0) {
      doc.font("Helvetica-Bold").fontSize(11)
         .text("▶ Refund Due", leftCol, y);
      doc.fillColor("green")
         .text(formatNumber(data.taxBreakdown.refundDue), colAmount, y, { width: 80, align: "right" });
      doc.fillColor("black");
    } else if (data.taxBreakdown.taxPayable && data.taxBreakdown.taxPayable > 0) {
      doc.font("Helvetica-Bold").fontSize(11)
         .text("▶ Tax Payable", leftCol, y);
      doc.fillColor("red")
         .text(formatNumber(data.taxBreakdown.taxPayable), colAmount, y, { width: 80, align: "right" });
      doc.fillColor("black");
    } else {
      doc.font("Helvetica-Bold").fontSize(11)
         .text("▶ Balance Tax", leftCol, y);
      doc.text("NIL", colAmount, y, { width: 80, align: "right" });
    }
    y += 40;

    if (data.bankDetails) {
      doc.font("Helvetica-Bold").fontSize(10)
         .text("Bank Details for Refund", leftCol, y);
      y += 15;
      doc.font("Helvetica").fontSize(9);
      doc.text(`Bank Name: ${data.bankDetails.bankName}`, leftCol + 15, y);
      y += 12;
      doc.text(`Account No: ${data.bankDetails.accountNumber}`, leftCol + 15, y);
      y += 12;
      doc.text(`IFSC Code: ${data.bankDetails.ifscCode}`, leftCol + 15, y);
      y += 25;
    }

    const compDate = new Date(data.computationDate);
    doc.fontSize(9).font("Helvetica")
       .text(`Date: ${compDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, leftCol, y);
    
    y += 40;
    doc.text(`(${data.personalInfo.name.toUpperCase()})`, rightCol, y, { align: "right" });

    // Footer with branding
    y += 50;
    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor("#1E40AF").lineWidth(1).stroke();
    y += 15;
    
    doc.fontSize(9).font("Helvetica-Bold")
       .fillColor("#1E40AF")
       .text("Generated by AiTaxBot | www.aitaxbot.co.in", { align: "center" });
    y += 12;
    
    doc.fontSize(8).font("Helvetica")
       .fillColor("#666666")
       .text("AI-Powered Tax Calculator & Financial Tools", { align: "center" });
    y += 10;
    
    doc.fontSize(7)
       .fillColor("#999999")
       .text("Disclaimer: This computation is for informational purposes only. Please consult a qualified tax professional for filing.", { align: "center" });

    doc.end();
  });
}

export async function savePDFToStorage(pdfBuffer: Buffer, userId: string): Promise<string> {
  // Save PDF to local file system in a temporary directory
  const uploadDir = path.join(process.cwd(), "temp-pdfs");
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const fileName = `tax-computation-${randomUUID()}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  
  // Write PDF to file
  fs.writeFileSync(filePath, pdfBuffer);
  
  // Return the file path (in production, you might want to use a cloud storage solution)
  return `/temp-pdfs/${fileName}`;
}
