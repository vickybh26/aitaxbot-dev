// LLM processor for structuring extracted text into unified tax schema
import { GoogleGenAI } from "@google/genai";
import { UnifiedTaxData } from "@shared/taxSchema";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

const TAX_EXTRACTION_PROMPT = `You are an expert Indian tax assistant.

Task:
Extract data from the following document and return it in the exact JSON schema given below. 
If any field is missing in the document, set it to 0 or "" (empty string). 
Do not add extra fields. Do not explain. Return ONLY valid JSON.

Schema:
{
  "taxpayer": {
    "name": "string",
    "pan": "string",
    "assessment_year": "string",
    "financial_year": "string"
  },
  "salary_income": {
    "employer_name": "string",
    "gross_salary": "number",
    "exempt_allowances": {
      "hra": "number",
      "leave_travel_allowance": "number",
      "gratuity": "number",
      "other": "number"
    },
    "perquisites": "number",
    "standard_deduction": "number",
    "net_salary": "number"
  },
  "house_property_income": {
    "self_occupied_loss": "number",
    "let_out_income": "number",
    "total_house_property": "number"
  },
  "business_profession_income": {
    "gross_receipts": "number",
    "expenses": "number",
    "net_profit": "number"
  },
  "capital_gains": {
    "short_term": "number",
    "long_term": "number",
    "crypto_gains": "number",
    "total_capital_gains": "number"
  },
  "other_income": {
    "interest_income": "number",
    "dividends": "number",
    "lottery_winnings": "number",
    "foreign_income": "number",
    "other": "number"
  },
  "deductions": {
    "80C": "number",
    "80CCC": "number",
    "80CCD1": "number",
    "80CCD1B": "number",
    "80CCD2": "number",
    "80D": "number",
    "80E": "number",
    "80G": "number",
    "80TTA": "number",
    "other": "number",
    "total_deductions": "number"
  },
  "tds_tcs": {
    "tds_salary": "number",
    "tds_other": "number",
    "tcs": "number",
    "advance_tax": "number",
    "self_assessment_tax": "number",
    "total_tax_paid": "number"
  },
  "tax_computation": {
    "gross_total_income": "number",
    "taxable_income": "number",
    "tax_liability": "number",
    "rebate_87A": "number",
    "surcharge": "number",
    "cess": "number",
    "total_tax_liability": "number",
    "tax_refund_or_payable": "number"
  }
}

Document:
"""
{{EXTRACTED_TEXT}}
"""`;

export async function structureDataWithLLM(extractedText: string): Promise<UnifiedTaxData | null> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      console.log('No Google API key found, skipping LLM processing');
      return null;
    }

    const prompt = TAX_EXTRACTION_PROMPT.replace('{{EXTRACTED_TEXT}}', extractedText);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from LLM");
    }

    console.log('LLM structured response received');
    
    // Parse and validate the JSON
    const structuredData: UnifiedTaxData = JSON.parse(rawJson);
    
    // Basic validation
    if (!structuredData.taxpayer || !structuredData.salary_income) {
      throw new Error("Invalid structured data format");
    }

    return structuredData;
  } catch (error) {
    console.error('LLM processing error:', error);
    return null;
  }
}

// Fallback function to create basic structured data from simple text extraction
export function createFallbackStructuredData(extractedText: string): UnifiedTaxData {
  // Simple regex patterns for basic extraction
  const panMatch = extractedText.match(/PAN[:\s]*([A-Z]{5}[0-9]{4}[A-Z]{1})/i);
  const nameMatch = extractedText.match(/Name[:\s]*([A-Za-z\s]+)/i);
  const salaryMatch = extractedText.match(/Gross\s*Salary[:\s]*(?:Rs\.?\s*)?([0-9,]+)/i);
  const tdsMatch = extractedText.match(/TDS[:\s]*(?:Rs\.?\s*)?([0-9,]+)/i);

  return {
    taxpayer: {
      name: nameMatch?.[1]?.trim() || "",
      pan: panMatch?.[1] || "",
      assessment_year: "2024-25",
      financial_year: "2023-24"
    },
    salary_income: {
      employer_name: "",
      gross_salary: salaryMatch ? parseFloat(salaryMatch[1].replace(/,/g, '')) : 0,
      exempt_allowances: {
        hra: 0,
        leave_travel_allowance: 0,
        gratuity: 0,
        other: 0
      },
      perquisites: 0,
      standard_deduction: 50000,
      net_salary: 0
    },
    house_property_income: {
      self_occupied_loss: 0,
      let_out_income: 0,
      total_house_property: 0
    },
    business_profession_income: {
      gross_receipts: 0,
      expenses: 0,
      net_profit: 0
    },
    capital_gains: {
      short_term: 0,
      long_term: 0,
      crypto_gains: 0,
      total_capital_gains: 0
    },
    other_income: {
      interest_income: 0,
      dividends: 0,
      lottery_winnings: 0,
      foreign_income: 0,
      other: 0
    },
    deductions: {
      "80C": 0,
      "80CCC": 0,
      "80CCD1": 0,
      "80CCD1B": 0,
      "80CCD2": 0,
      "80D": 0,
      "80E": 0,
      "80G": 0,
      "80TTA": 0,
      other: 0,
      total_deductions: 0
    },
    tds_tcs: {
      tds_salary: tdsMatch ? parseFloat(tdsMatch[1].replace(/,/g, '')) : 0,
      tds_other: 0,
      tcs: 0,
      advance_tax: 0,
      self_assessment_tax: 0,
      total_tax_paid: 0
    },
    tax_computation: {
      gross_total_income: 0,
      taxable_income: 0,
      tax_liability: 0,
      rebate_87A: 0,
      surcharge: 0,
      cess: 0,
      total_tax_liability: 0,
      tax_refund_or_payable: 0
    }
  };
}