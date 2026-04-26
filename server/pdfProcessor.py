#!/usr/bin/env python3
"""
PDF Processing Service for AiTaxBot
Extracts text from tax documents (Form 16, AIS, 26AS) using pdfplumber,
then sends to Google Gemini for structured extraction.
No Adobe dependency required.
"""

import json
import sys
import os
import re
import pdfplumber
import urllib.request
import urllib.error
from typing import Dict, Optional, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# TEXT EXTRACTION
# ──────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF using pdfplumber (handles tables too)."""
    text_parts = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                # Extract tables separately for better accuracy
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        for row in table:
                            if row:
                                clean_row = [str(cell or "").strip() for cell in row]
                                if any(clean_row):
                                    text_parts.append(" | ".join(clean_row))
    except Exception as e:
        logger.error(f"pdfplumber extraction error: {e}")
        raise

    full_text = "\n".join(text_parts)
    if not full_text.strip():
        raise ValueError("No text could be extracted from the PDF. It may be a scanned/image-only PDF.")
    return full_text


# ──────────────────────────────────────────────
# GEMINI STRUCTURED EXTRACTION
# ──────────────────────────────────────────────

GEMINI_PROMPT = """You are an expert Indian tax document analyst.

Extract data from the following Indian tax document and return ONLY a valid JSON object matching this exact schema.
Set missing fields to 0 or "" (empty string). Do NOT add extra fields. Do NOT include markdown or explanation.

JSON Schema:
{
  "taxpayer": {"name": "string", "pan": "string", "assessment_year": "string", "financial_year": "string"},
  "salary_income": {
    "employer_name": "string", "gross_salary": 0,
    "exempt_allowances": {"hra": 0, "leave_travel_allowance": 0, "gratuity": 0, "other": 0},
    "perquisites": 0, "standard_deduction": 0, "net_salary": 0
  },
  "house_property_income": {"self_occupied_loss": 0, "let_out_income": 0, "total_house_property": 0},
  "business_profession_income": {"gross_receipts": 0, "expenses": 0, "net_profit": 0},
  "capital_gains": {"short_term": 0, "long_term": 0, "crypto_gains": 0, "total_capital_gains": 0},
  "other_income": {"interest_income": 0, "dividends": 0, "lottery_winnings": 0, "foreign_income": 0, "other": 0},
  "deductions": {"80C": 0, "80CCC": 0, "80CCD1": 0, "80CCD1B": 0, "80CCD2": 0, "80D": 0, "80E": 0, "80G": 0, "80TTA": 0, "other": 0, "total_deductions": 0},
  "tds_tcs": {"tds_salary": 0, "tds_other": 0, "tcs": 0, "advance_tax": 0, "self_assessment_tax": 0, "total_tax_paid": 0},
  "tax_computation": {"gross_total_income": 0, "taxable_income": 0, "tax_liability": 0, "rebate_87A": 0, "surcharge": 0, "cess": 0, "total_tax_liability": 0, "tax_refund_or_payable": 0}
}

Document text:
\"\"\"
{DOCUMENT_TEXT}
\"\"\"
"""


def call_gemini(text: str, api_key: str) -> Dict:
    """Call Gemini 2.0 Flash API and return parsed JSON."""
    prompt = GEMINI_PROMPT.replace("{DOCUMENT_TEXT}", text[:12000])
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
    }).encode("utf-8")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError(f"No candidates in Gemini response")
        json_text = candidates[0]["content"]["parts"][0]["text"].strip()
        # Strip markdown fences if present
        json_text = re.sub(r"^```json\s*", "", json_text)
        json_text = re.sub(r"\s*```$", "", json_text.strip())
        return json.loads(json_text)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise ValueError(f"Gemini API error {e.code}: {error_body[:300]}")


# ──────────────────────────────────────────────
# REGEX FALLBACK
# ──────────────────────────────────────────────

def regex_fallback(text: str) -> Dict:
    """Basic regex extraction when Gemini key is unavailable."""
    def find_amount(patterns, txt):
        for pat in patterns:
            m = re.search(pat, txt, re.IGNORECASE | re.DOTALL)
            if m:
                try:
                    return float(m.group(1).replace(",", "").strip())
                except ValueError:
                    pass
        return 0.0

    pan = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', text)
    name = re.search(r'(?:Name of Employee|Employee Name|Name)\s*[:\-]?\s*([A-Za-z ]{3,50})', text, re.IGNORECASE)
    ay = re.search(r'Assessment Year\s*[:\-]?\s*(\d{4}-\d{2,4})', text, re.IGNORECASE)
    gross_salary = find_amount([r'Gross Salary.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'], text)
    tds = find_amount([r'Total Tax Deducted.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', r'TDS.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'], text)
    taxable_income = find_amount([r'Total Taxable Income.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'], text)

    return {
        "taxpayer": {
            "name": name.group(1).strip() if name else "",
            "pan": pan.group(1) if pan else "",
            "assessment_year": ay.group(1) if ay else "",
            "financial_year": ""
        },
        "salary_income": {
            "employer_name": "", "gross_salary": gross_salary,
            "exempt_allowances": {"hra": 0, "leave_travel_allowance": 0, "gratuity": 0, "other": 0},
            "perquisites": 0, "standard_deduction": 50000, "net_salary": max(0, gross_salary - 50000)
        },
        "house_property_income": {"self_occupied_loss": 0, "let_out_income": 0, "total_house_property": 0},
        "business_profession_income": {"gross_receipts": 0, "expenses": 0, "net_profit": 0},
        "capital_gains": {"short_term": 0, "long_term": 0, "crypto_gains": 0, "total_capital_gains": 0},
        "other_income": {"interest_income": 0, "dividends": 0, "lottery_winnings": 0, "foreign_income": 0, "other": 0},
        "deductions": {"80C": 0, "80CCC": 0, "80CCD1": 0, "80CCD1B": 0, "80CCD2": 0, "80D": 0, "80E": 0, "80G": 0, "80TTA": 0, "other": 0, "total_deductions": 0},
        "tds_tcs": {"tds_salary": tds, "tds_other": 0, "tcs": 0, "advance_tax": 0, "self_assessment_tax": 0, "total_tax_paid": tds},
        "tax_computation": {"gross_total_income": gross_salary, "taxable_income": taxable_income, "tax_liability": 0, "rebate_87A": 0, "surcharge": 0, "cess": 0, "total_tax_liability": 0, "tax_refund_or_payable": 0}
    }


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def process_document(file_path: str, document_type: str) -> Dict:
    # Step 1: Extract text
    try:
        extracted_text = extract_text_from_pdf(file_path)
        logger.info(f"Extracted {len(extracted_text)} characters from {document_type}")
    except Exception as e:
        return {"success": False, "error": f"PDF text extraction failed: {str(e)}", "processingMethod": "failed"}

    # Step 2: Try Gemini
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if api_key:
        try:
            structured = call_gemini(extracted_text, api_key)
            logger.info("Gemini extraction successful")
            return {
                "success": True, "data": structured,
                "extractedText": extracted_text[:2000],
                "processingMethod": "gemini_ai",
                "message": f"Successfully extracted data from {document_type} using AI"
            }
        except Exception as e:
            logger.warning(f"Gemini failed, falling back to regex: {e}")

    # Step 3: Regex fallback
    try:
        structured = regex_fallback(extracted_text)
        return {
            "success": True, "data": structured,
            "extractedText": extracted_text[:2000],
            "processingMethod": "regex_fallback",
            "message": "Data extracted using pattern matching (AI key not set). Some fields may be incomplete."
        }
    except Exception as e:
        return {"success": False, "error": f"All extraction methods failed: {str(e)}", "processingMethod": "failed"}


def main():
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "Usage: python pdfProcessor.py <file_path> <document_type>"}))
        sys.exit(1)
    result = process_document(sys.argv[1], sys.argv[2])
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()
