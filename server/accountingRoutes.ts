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
    
    // Get counts
    const firms = await storage.getFirms(userId);
    const firmsCount = firms.length;
    
    // Get all invoices across all firms
    let totalInvoices = 0;
    let totalRevenue = 0;
    let paidInvoices = 0;
    
    for (const firm of firms) {
      const invoices = await storage.getInvoices(firm.id);
      totalInvoices += invoices.length;
      
      for (const invoice of invoices) {
        totalRevenue += parseFloat(invoice.grandTotal || "0");
        if (invoice.paymentStatus === "paid") {
          paidInvoices++;
        }
      }
    }
    
    // Get all clients across all firms
    let totalClients = 0;
    for (const firm of firms) {
      const clients = await storage.getClients(firm.id);
      totalClients += clients.length;
    }
    
    // Get tax profiles count (tax calculations done)
    let taxCalculations = 0;
    try {
      const taxProfiles = await storage.getUserTaxProfiles(userId);
      taxCalculations = taxProfiles.length;
    } catch (error: any) {
      // Index might not exist yet, ignore gracefully
      console.log("Tax profiles query needs index, defaulting to 0");
    }
    
    res.json({
      firmsCount,
      invoicesCount: totalInvoices,
      clientsCount: totalClients,
      totalRevenue: totalRevenue.toFixed(2),
      paidInvoices,
      unpaidInvoices: totalInvoices - paidInvoices,
      taxCalculations
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
    const activities: any[] = [];
    
    // Get user's firms
    const firms = await storage.getFirms(userId);
    
    // Get recent invoices (limit to 10 most recent)
    const recentInvoices: any[] = [];
    for (const firm of firms) {
      const invoices = await storage.getInvoices(firm.id);
      for (const invoice of invoices) {
        const client = await storage.getClient(invoice.clientId);
        recentInvoices.push({
          ...invoice,
          firmName: firm.firmName,
          clientName: client?.clientName || "Unknown Client"
        });
      }
    }
    
    // Sort by date and take most recent
    recentInvoices.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Add invoice activities
    for (const invoice of recentInvoices.slice(0, 5)) {
      activities.push({
        type: "invoice",
        title: `Generated Invoice ${invoice.invoiceNumber}`,
        description: `Client: ${invoice.clientName} - Amount: ₹${parseFloat(invoice.grandTotal || "0").toLocaleString('en-IN')}`,
        time: invoice.createdAt || new Date(),
        icon: "FileText",
        color: "text-green-600"
      });
    }
    
    // Add firm creation activities
    const recentFirms = [...firms].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    }).slice(0, 3);
    
    for (const firm of recentFirms) {
      activities.push({
        type: "firm",
        title: `Created Firm: ${firm.firmName}`,
        description: firm.gstin ? `GSTIN: ${firm.gstin}` : "Firm registration",
        time: firm.createdAt || new Date(),
        icon: "Building2",
        color: "text-orange-600"
      });
    }
    
    // Sort all activities by time
    activities.sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    });
    
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
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create firm", details: error.message });
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
      return res.status(400).json({ error: "Invalid data", details: error.errors });
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
      return res.status(400).json({ error: "Invalid data", details: error.errors });
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
