import express from "express";
import { storage } from "./storage";
import { geminiAccountingService } from "./geminiAccountingService";
import {
  insertFirmSchema,
  insertClientSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
} from "@shared/schema";
import { z } from "zod";
import { authenticateFirebaseToken, AuthenticatedRequest } from "./middleware/auth.js";

const router = express.Router();

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

// Get dashboard statistics for user
router.get("/dashboard/stats", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;

    // Step 1: fetch firms (single query)
    const firms = await storage.getFirms(userId);
    const firmIds = firms.map((f) => f.id);

    // Step 2: fetch invoices + clients for ALL firms in parallel (batch, not serial loop)
    //
    // `taxCalculations` previously counted storage.getUserTaxProfiles(), i.e. the
    // `taxProfiles` collection — but createTaxProfile() is never called anywhere
    // in this codebase, so that collection is always empty and the figure was a
    // hardcoded 0 in disguise. It now counts taxCalculationHistory, which is what
    // POST /api/tax-calculations actually writes.
    //
    // The failure is logged rather than swallowed: the old `.catch(() => [])`
    // turned a missing-index error into a silent zero, which is precisely why
    // this went unnoticed for months.
    const [allInvoicesArrays, allClientsArrays, savedCalculations] = await Promise.all([
      Promise.all(firmIds.map((id) => storage.getInvoices(id))),
      Promise.all(firmIds.map((id) => storage.getClients(id))),
      storage.getTaxCalculationHistory(userId).catch((e) => {
        console.error(`[Accounting] taxCalculationHistory failed for ${userId}:`, e);
        return [];
      }),
    ]);

    const allInvoices = allInvoicesArrays.flat();
    const totalClients = allClientsArrays.flat().length;

    let totalRevenue = 0;
    let paidInvoices = 0;
    for (const inv of allInvoices) {
      totalRevenue += parseFloat((inv.grandTotal as string) || "0");
      if (inv.paymentStatus === "paid") paidInvoices++;
    }

    res.json({
      firmsCount: firms.length,
      invoicesCount: allInvoices.length,
      clientsCount: totalClients,
      totalRevenue: totalRevenue.toFixed(2),
      paidInvoices,
      unpaidInvoices: allInvoices.length - paidInvoices,
      taxCalculations: savedCalculations.length,
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
});

// Get recent activities for user
router.get("/dashboard/activities", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;

    // Step 1: firms (1 query)
    const firms = await storage.getFirms(userId);
    const firmMap = new Map(firms.map((f) => [f.id, f]));

    // Step 2: all invoices for all firms in parallel (N queries → 1 per firm, all at once)
    const invoiceArrays = await Promise.all(firms.map((f) => storage.getInvoices(f.id)));
    const allInvoices = invoiceArrays.flat();

    // Step 3: sort & take top 10 invoices before fetching clients
    allInvoices.sort((a, b) =>
      new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );
    const topInvoices = allInvoices.slice(0, 10);

    // Step 4: fetch only the unique clients we actually need (de-duplicated batch)
    const uniqueClientIds = Array.from(new Set(topInvoices.map((i) => i.clientId).filter(Boolean)));
    const clientDocs = await Promise.all(uniqueClientIds.map((id) => storage.getClient(id as string)));
    const clientMap = new Map(
      clientDocs.filter(Boolean).map((c) => [c!.id, c!])
    );

    // Build activity list
    const activities: any[] = [];

    for (const invoice of topInvoices.slice(0, 5)) {
      const client = clientMap.get(invoice.clientId as string);
      const firm   = firmMap.get(invoice.firmId);
      activities.push({
        type: "invoice",
        title: `Generated Invoice ${invoice.invoiceNumber}`,
        description: `Client: ${client?.clientName ?? "Unknown"} — ₹${parseFloat((invoice.grandTotal as string) || "0").toLocaleString("en-IN")}`,
        time: invoice.createdAt || new Date(),
        icon: "FileText",
        color: "text-green-600",
        firmName: firm?.firmName,
      });
    }

    const recentFirms = [...firms]
      .sort((a, b) =>
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
      )
      .slice(0, 3);

    for (const firm of recentFirms) {
      activities.push({
        type: "firm",
        title: `Created Firm: ${firm.firmName}`,
        description: firm.gstin ? `GSTIN: ${firm.gstin}` : "Firm registration",
        time: firm.createdAt || new Date(),
        icon: "Building2",
        color: "text-orange-600",
      });
    }

    activities.sort((a, b) =>
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    res.json(activities.slice(0, 10));
  } catch (error: any) {
    console.error("Error fetching dashboard activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// ==========================================
// FIRM ROUTES
// ==========================================

// Get all firms for current user
router.get("/firms", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firms = await storage.getFirms(req.userId!);
    res.json(firms);
  } catch (error: any) {
    console.error("Error fetching firms:", error);
    res.status(500).json({ error: "Failed to fetch firms" });
  }
});

// Get a single firm
router.get("/firms/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.id);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    res.json(firm);
  } catch (error: any) {
    console.error("Error fetching firm:", error);
    res.status(500).json({ error: "Failed to fetch firm" });
  }
});

// Create a new firm
router.post("/firms", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Creating firm with data:", req.body);
    console.log("User ID:", req.userId);
    const validatedData = insertFirmSchema.parse({
      ...req.body,
      userId: req.userId,
    });
    console.log("Validated data:", validatedData);
    const firm = await storage.createFirm(validatedData);
    console.log("Firm created successfully:", firm);
    res.status(201).json(firm);
  } catch (error: any) {
    console.error("Error creating firm:", error);
    console.error("Error details:", error.message, error.stack);
    if (error instanceof z.ZodError) {
      // Don't echo Zod's internal `errors` array — it can expose schema shape.
      return res.status(400).json({ error: "Invalid data" });
    }
    // Don't leak raw error messages to clients — they can reveal internal paths.
    res.status(500).json({ error: "Failed to create firm" });
  }
});

// Update a firm
router.put("/firms/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.id);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const updated = await storage.updateFirm(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating firm:", error);
    res.status(500).json({ error: "Failed to update firm" });
  }
});

// Delete a firm
router.delete("/firms/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.id);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    await storage.deleteFirm(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting firm:", error);
    res.status(500).json({ error: "Failed to delete firm" });
  }
});

// ==========================================
// CLIENT ROUTES
// ==========================================

// Get all clients for a firm
router.get("/firms/:firmId/clients", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.firmId);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const clients = await storage.getClients(req.params.firmId);
    res.json(clients);
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// Get a single client
router.get("/clients/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const client = await storage.getClient(req.params.id);
    if (!client || client.userId !== req.userId) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(client);
  } catch (error: any) {
    console.error("Error fetching client:", error);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

// Create a new client
router.post("/firms/:firmId/clients", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.firmId);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const validatedData = insertClientSchema.parse({
      ...req.body,
      firmId: req.params.firmId,
      userId: req.userId,
    });
    const client = await storage.createClient(validatedData);
    res.status(201).json(client);
  } catch (error: any) {
    console.error("Error creating client:", error);
    if (error instanceof z.ZodError) {
      // Don't echo Zod's internal `errors` array — it can expose schema shape.
      return res.status(400).json({ error: "Invalid data" });
    }
    res.status(500).json({ error: "Failed to create client" });
  }
});

// Update a client
router.put("/clients/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const client = await storage.getClient(req.params.id);
    if (!client || client.userId !== req.userId) {
      return res.status(404).json({ error: "Client not found" });
    }
    
    const updated = await storage.updateClient(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating client:", error);
    res.status(500).json({ error: "Failed to update client" });
  }
});

// Delete a client
router.delete("/clients/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const client = await storage.getClient(req.params.id);
    if (!client || client.userId !== req.userId) {
      return res.status(404).json({ error: "Client not found" });
    }
    
    await storage.deleteClient(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting client:", error);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// ==========================================
// INVOICE ROUTES
// ==========================================

// Get all invoices for a firm
router.get("/firms/:firmId/invoices", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.firmId);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const invoices = await storage.getInvoices(req.params.firmId);
    res.json(invoices);
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Get a single invoice with items
router.get("/invoices/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice || invoice.userId !== req.userId) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    const items = await storage.getInvoiceItems(req.params.id);
    res.json({ ...invoice, items });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// Create a new invoice with items and update sales register
router.post("/invoices", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { items, ...invoiceData } = req.body;
    
    // Validate invoice data
    const validatedInvoice = insertInvoiceSchema.parse({
      ...invoiceData,
      userId: req.userId,
    });
    
    // Create invoice
    const invoice = await storage.createInvoice(validatedInvoice);
    
    // Create invoice items
    const createdItems = [];
    for (const item of items || []) {
      const validatedItem = insertInvoiceItemSchema.parse({
        ...item,
        invoiceId: invoice.id,
      });
      const createdItem = await storage.createInvoiceItem(validatedItem);
      createdItems.push(createdItem);
    }
    
    // Update sales register
    const invoiceDate = new Date(invoice.invoiceDate);
    const month = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
    
    const currentRegister = await storage.getSalesRegister(invoice.firmId, month);
    
    const registerData = {
      firmId: invoice.firmId,
      userId: req.userId,
      month,
      year: invoiceDate.getFullYear(),
      totalInvoices: (currentRegister?.totalInvoices || 0) + 1,
      totalSales: String(Number(currentRegister?.totalSales || 0) + Number(invoice.subtotal)),
      totalCgst: String(Number(currentRegister?.totalCgst || 0) + Number(invoice.cgst)),
      totalSgst: String(Number(currentRegister?.totalSgst || 0) + Number(invoice.sgst)),
      totalIgst: String(Number(currentRegister?.totalIgst || 0) + Number(invoice.igst)),
      totalTax: String(Number(currentRegister?.totalTax || 0) + Number(invoice.totalTax)),
      grandTotal: String(Number(currentRegister?.grandTotal || 0) + Number(invoice.grandTotal)),
      invoiceIds: [...(currentRegister?.invoiceIds || []), invoice.id],
    };
    
    await storage.updateSalesRegister(invoice.firmId, month, registerData);
    
    res.status(201).json({ ...invoice, items: createdItems });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    if (error instanceof z.ZodError) {
      // Don't echo Zod's internal `errors` array — it can expose schema shape.
      return res.status(400).json({ error: "Invalid data" });
    }
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Update invoice
router.put("/invoices/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice || invoice.userId !== req.userId) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    const updated = await storage.updateInvoice(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

// Delete invoice
router.delete("/invoices/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice || invoice.userId !== req.userId) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    await storage.deleteInvoice(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// ==========================================
// SALES REGISTER ROUTES
// ==========================================

// Get sales register for a firm and month
router.get("/sales-register/:firmId/:month", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.firmId);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const register = await storage.getSalesRegister(req.params.firmId, req.params.month);
    if (!register) {
      return res.json({
        firmId: req.params.firmId,
        month: req.params.month,
        totalInvoices: 0,
        totalSales: "0",
        totalCgst: "0",
        totalSgst: "0",
        totalIgst: "0",
        totalTax: "0",
        grandTotal: "0",
        invoiceIds: [],
      });
    }
    
    res.json(register);
  } catch (error: any) {
    console.error("Error fetching sales register:", error);
    res.status(500).json({ error: "Failed to fetch sales register" });
  }
});

// Get all sales registers for a firm (for table display)
router.get("/sales-registers/:firmId", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.firmId);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const registers = await storage.getAllSalesRegisters(req.params.firmId);
    res.json(registers);
  } catch (error: any) {
    console.error("Error fetching all sales registers:", error);
    res.status(500).json({ error: "Failed to fetch sales registers" });
  }
});

// ==========================================
// PURCHASE REGISTER ROUTES
// ==========================================

// Get purchase register for a firm and month
router.get("/purchase-register/:firmId/:month", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.firmId);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const register = await storage.getPurchaseRegister(req.params.firmId, req.params.month);
    if (!register) {
      return res.json({
        firmId: req.params.firmId,
        month: req.params.month,
        totalPurchases: 0,
        totalAmount: "0",
        totalCgst: "0",
        totalSgst: "0",
        totalIgst: "0",
        totalTax: "0",
        grandTotal: "0",
        purchases: [],
      });
    }
    
    res.json(register);
  } catch (error: any) {
    console.error("Error fetching purchase register:", error);
    res.status(500).json({ error: "Failed to fetch purchase register" });
  }
});

// Get all purchase registers for a firm (for table display)
router.get("/purchase-registers/:firmId", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.firmId);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const registers = await storage.getAllPurchaseRegisters(req.params.firmId);
    res.json(registers);
  } catch (error: any) {
    console.error("Error fetching all purchase registers:", error);
    res.status(500).json({ error: "Failed to fetch purchase registers" });
  }
});

// Create or update purchase register entry
router.post("/purchase-register/:firmId", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const firm = await storage.getFirm(req.params.firmId);
    if (!firm || firm.userId !== req.userId) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    const { month, ...purchaseData } = req.body;
    if (!month) {
      return res.status(400).json({ error: "Month is required (format: YYYY-MM)" });
    }
    
    const register = await storage.updatePurchaseRegister(req.params.firmId, month, {
      ...purchaseData,
      userId: req.userId,
      year: parseInt(month.split('-')[0])
    });
    
    res.json(register);
  } catch (error: any) {
    console.error("Error creating purchase register:", error);
    res.status(500).json({ error: "Failed to create purchase register" });
  }
});

// ==========================================
// AI/GEMINI ROUTES
// ==========================================

// Get HSN code for an item
router.post("/ai/hsn", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { itemDescription } = req.body;
    
    if (!itemDescription) {
      return res.status(400).json({ error: "Item description is required" });
    }
    
    const result = await geminiAccountingService.getHSNCode(itemDescription);
    res.json(result);
  } catch (error: any) {
    console.error("Error getting HSN code:", error);
    res.status(500).json({ error: error.message || "Failed to get HSN code" });
  }
});

// Validate GST calculation
router.post("/ai/validate-gst", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await geminiAccountingService.validateGSTCalculation(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Error validating GST:", error);
    res.status(500).json({ error: "Failed to validate GST" });
  }
});

// Generate invoice summary
router.post("/ai/invoice-summary", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const summary = await geminiAccountingService.generateInvoiceSummary(req.body);
    res.json({ summary });
  } catch (error: any) {
    console.error("Error generating summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
