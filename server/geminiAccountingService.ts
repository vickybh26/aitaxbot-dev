import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export class GeminiAccountingService {
  private hsnCache: Map<string, { code: string; description: string }> = new Map();

  async getHSNCode(itemDescription: string): Promise<{ hsnCode: string; description: string }> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    // Check cache first
    const cached = this.hsnCache.get(itemDescription.toLowerCase());
    if (cached) {
      return { hsnCode: cached.code, description: cached.description };
    }

    try {
      const prompt = `Return only the correct HSN or SAC code and a short description for: "${itemDescription}". 
Format your response as:
HSN/SAC: [code]
Description: [short description]
No additional explanation.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const response = result.text.trim();

      // Parse the response
      const hsnMatch = response.match(/HSN\/SAC:\s*(\d+)/i);
      const descMatch = response.match(/Description:\s*(.+)/i);

      const hsnCode = hsnMatch ? hsnMatch[1] : "";
      const description = descMatch ? descMatch[1].trim() : itemDescription;

      // Cache the result
      if (hsnCode) {
        this.hsnCache.set(itemDescription.toLowerCase(), { code: hsnCode, description });
      }

      return { hsnCode, description };
    } catch (error) {
      console.error("Error getting HSN code from Gemini:", error);
      // Return empty code if error
      return { hsnCode: "", description: itemDescription };
    }
  }

  async validateGSTCalculation(invoiceData: {
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    grandTotal: number;
    items: Array<{
      amount: number;
      gstRate: number;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
    }>;
  }): Promise<{ isValid: boolean; message: string }> {
    if (!process.env.GOOGLE_API_KEY) {
      // Fallback to manual validation
      return this.manualGSTValidation(invoiceData);
    }

    try {
      const prompt = `Check if the GST calculation in this invoice is correct. Respond with either "OK" or a short correction note.

Invoice Data:
- Subtotal: ₹${invoiceData.subtotal}
- CGST: ₹${invoiceData.cgst}
- SGST: ₹${invoiceData.sgst}
- IGST: ₹${invoiceData.igst}
- Total Tax: ₹${invoiceData.totalTax}
- Grand Total: ₹${invoiceData.grandTotal}

Items:
${invoiceData.items.map((item, i) => `
  Item ${i + 1}: Amount ₹${item.amount}, GST Rate ${item.gstRate}%
  CGST: ₹${item.cgstAmount}, SGST: ₹${item.sgstAmount}, IGST: ₹${item.igstAmount}
`).join('\n')}

Respond only with "OK" if correct, or a short note explaining the error.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const response = result.text.trim();

      return {
        isValid: response.toUpperCase().includes("OK"),
        message: response
      };
    } catch (error) {
      console.error("Error validating GST with Gemini:", error);
      return this.manualGSTValidation(invoiceData);
    }
  }

  private manualGSTValidation(invoiceData: {
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    grandTotal: number;
  }): { isValid: boolean; message: string } {
    const calculatedTax = invoiceData.cgst + invoiceData.sgst + invoiceData.igst;
    const calculatedTotal = invoiceData.subtotal + calculatedTax;

    const taxDiff = Math.abs(calculatedTax - invoiceData.totalTax);
    const totalDiff = Math.abs(calculatedTotal - invoiceData.grandTotal);

    if (taxDiff > 0.01 || totalDiff > 0.01) {
      return {
        isValid: false,
        message: `GST calculation mismatch. Expected total tax: ₹${calculatedTax.toFixed(2)}, Grand total: ₹${calculatedTotal.toFixed(2)}`
      };
    }

    return {
      isValid: true,
      message: "OK"
    };
  }

  async generateInvoiceSummary(invoiceData: {
    invoiceNumber: string;
    clientName: string;
    grandTotal: number;
    itemCount: number;
  }): Promise<string> {
    if (!process.env.GOOGLE_API_KEY) {
      return `Invoice ${invoiceData.invoiceNumber} for ${invoiceData.clientName}: ${invoiceData.itemCount} item(s), Total ₹${invoiceData.grandTotal.toFixed(2)}`;
    }

    try {
      const prompt = `Summarize this invoice in one professional line for a client email:
- Invoice: ${invoiceData.invoiceNumber}
- Client: ${invoiceData.clientName}
- Items: ${invoiceData.itemCount}
- Total Amount: ₹${invoiceData.grandTotal}

Return only the one-line summary, no explanation.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return result.text.trim();
    } catch (error) {
      console.error("Error generating invoice summary:", error);
      return `Invoice ${invoiceData.invoiceNumber} for ${invoiceData.clientName}: ${invoiceData.itemCount} item(s), Total ₹${invoiceData.grandTotal.toFixed(2)}`;
    }
  }
}

export const geminiAccountingService = new GeminiAccountingService();
