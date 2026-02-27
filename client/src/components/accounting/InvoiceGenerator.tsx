import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, FileText, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sanitizeError } from "@/lib/errorHandler";

interface Client {
  id: string;
  clientName: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface Firm {
  id: string;
  firmName: string;
  isGstRegistered: boolean;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  pan?: string;
}

interface LineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
  gstRate: string;
}

export default function InvoiceGenerator({ firmId }: { firmId: string }) {
  const { toast } = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState("");
  const [isGstInvoice, setIsGstInvoice] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", hsnSac: "", quantity: "1", unit: "nos", rate: "0", amount: "0", gstRate: "18" }
  ]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  // Fetch firm details
  const { data: firm } = useQuery<Firm>({
    queryKey: [`/api/accounting/firms/${firmId}`],
    enabled: !!firmId,
  });

  // Sync isGstInvoice with firm's GST registration status
  useEffect(() => {
    if (firm) {
      setIsGstInvoice(firm.isGstRegistered);
    }
  }, [firm]);

  // Fetch clients for the firm
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: [`/api/accounting/firms/${firmId}/clients`],
    enabled: !!firmId,
  });

  // Get selected client details
  const client = clients.find(c => c.id === selectedClient);

  // Add new line item
  const addLineItem = () => {
    const newId = (lineItems.length + 1).toString();
    setLineItems([...lineItems, {
      id: newId,
      description: "",
      hsnSac: "",
      quantity: "1",
      unit: "nos",
      rate: "0",
      amount: "0",
      gstRate: "18"
    }]);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  // Update line item
  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate amount
        if (field === 'quantity' || field === 'rate') {
          const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
          const rate = parseFloat(field === 'rate' ? value : updated.rate) || 0;
          updated.amount = (qty * rate).toFixed(2);
        }
        return updated;
      }
      return item;
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = (subtotal * parseFloat(discount)) / 100;
    const taxableValue = subtotal - discountAmount;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let totalTax = 0;

    // Calculate GST only if this is a GST invoice
    if (isGstInvoice) {
      // Determine if interstate or intrastate
      const firmState = firm?.state?.toUpperCase() || "";
      const clientState = client?.state?.toUpperCase() || "";
      const isInterstate = firmState !== clientState;

      if (isInterstate) {
        // Interstate: IGST = full GST rate
        igst = lineItems.reduce((sum, item) => {
          const itemAmount = parseFloat(item.amount) || 0;
          const itemAfterDiscount = itemAmount - (itemAmount * parseFloat(discount) / 100);
          const gstRate = parseFloat(item.gstRate) || 0;
          return sum + (itemAfterDiscount * gstRate / 100);
        }, 0);
      } else {
        // Intrastate: CGST + SGST = GST rate split equally
        const totalGst = lineItems.reduce((sum, item) => {
          const itemAmount = parseFloat(item.amount) || 0;
          const itemAfterDiscount = itemAmount - (itemAmount * parseFloat(discount) / 100);
          const gstRate = parseFloat(item.gstRate) || 0;
          return sum + (itemAfterDiscount * gstRate / 100);
        }, 0);
        cgst = totalGst / 2;
        sgst = totalGst / 2;
      }

      totalTax = cgst + sgst + igst;
    }

    const grandTotal = taxableValue + totalTax;

    // Determine if interstate for display purposes
    const firmState = firm?.state?.toUpperCase() || "";
    const clientState = client?.state?.toUpperCase() || "";
    const isInterstate = firmState !== clientState;

    return {
      subtotal,
      discountAmount,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal,
      isInterstate
    };
  };

  const totals = calculateTotals();

  // Convert number to words (Indian format)
  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero";
    
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    
    const convertHundreds = (n: number): string => {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertHundreds(n % 100) : "");
    };
    
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const hundred = Math.floor(num % 1000);
    
    let words = "";
    if (crore > 0) words += convertHundreds(crore) + " Crore ";
    if (lakh > 0) words += convertHundreds(lakh) + " Lakh ";
    if (thousand > 0) words += convertHundreds(thousand) + " Thousand ";
    if (hundred > 0) words += convertHundreds(hundred);
    
    return words.trim();
  };

  const amountInWords = () => {
    const rupees = Math.floor(totals.grandTotal);
    const paise = Math.round((totals.grandTotal - rupees) * 100);
    
    let words = "Rupees " + numberToWords(rupees);
    if (paise > 0) {
      words += " and " + numberToWords(paise) + " Paise";
    }
    return words + " only";
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) {
        throw new Error("Please select a client");
      }
      if (!invoiceNumber) {
        throw new Error("Please enter invoice number");
      }
      if (lineItems.some(item => !item.description)) {
        throw new Error("Please fill all line item descriptions");
      }

      const invoiceData = {
        firmId,
        clientId: selectedClient,
        userId: "default-user-id",
        invoiceNumber,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: null,
        isGstInvoice,
        subtotal: totals.subtotal.toString(),
        cgst: totals.cgst.toString(),
        sgst: totals.sgst.toString(),
        igst: totals.igst.toString(),
        totalTax: totals.totalTax.toString(),
        grandTotal: totals.grandTotal.toString(),
        paymentStatus: "unpaid",
        paidAmount: "0",
        notes,
        placeOfSupply: client?.state || "",
        items: lineItems.map(item => ({
          itemDescription: item.description,
          hsnSac: isGstInvoice ? item.hsnSac : "",
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          gstRate: isGstInvoice ? item.gstRate : "0",
          cgstAmount: (isGstInvoice && !totals.isInterstate ? (parseFloat(item.amount) * parseFloat(item.gstRate) / 200) : 0).toString(),
          sgstAmount: (isGstInvoice && !totals.isInterstate ? (parseFloat(item.amount) * parseFloat(item.gstRate) / 200) : 0).toString(),
          igstAmount: (isGstInvoice && totals.isInterstate ? (parseFloat(item.amount) * parseFloat(item.gstRate) / 100) : 0).toString(),
        }))
      };

      return await apiRequest("POST", "/api/accounting/invoices", invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounting/firms/${firmId}/invoices`] });
      toast({ title: "Success", description: "Invoice created successfully" });
      // Reset form - isGstInvoice will be reset by the useEffect when firm data refreshes
      setInvoiceNumber("");
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setSelectedClient("");
      setLineItems([{ id: "1", description: "", hsnSac: "", quantity: "1", unit: "nos", rate: "0", amount: "0", gstRate: "18" }]);
      setDiscount("0");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: sanitizeError(error), variant: "destructive" });
    },
  });

  if (!firmId) {
    return <div className="text-center py-8 text-gray-500">Please select a firm first</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create Invoice
        </h3>

        {/* Invoice Header */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <Label htmlFor="invoiceNumber">Invoice Number *</Label>
            <Input
              id="invoiceNumber"
              data-testid="input-invoice-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g., INV-001"
              required
            />
          </div>
          <div>
            <Label htmlFor="invoiceDate">Invoice Date *</Label>
            <Input
              id="invoiceDate"
              data-testid="input-invoice-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="client">Select Client *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger data-testid="select-client">
                <SelectValue placeholder="Choose client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* GST/Non-GST Toggle - Only show if firm is GST registered */}
        {firm?.isGstRegistered && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <Switch
                id="isGstInvoice"
                checked={isGstInvoice}
                onCheckedChange={setIsGstInvoice}
                data-testid="switch-gst-invoice"
              />
              <Label htmlFor="isGstInvoice" className="cursor-pointer font-medium">
                GST Invoice
              </Label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isGstInvoice ? "(GST will be calculated)" : "(No GST will be applied)"}
              </span>
            </div>
          </div>
        )}

        {/* Client Details Preview */}
        {client && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Bill To:</strong> {client.clientName}
                <br />
                {client.address && <>{client.address}<br /></>}
                {client.city && <>{client.city}, </>}
                {client.state && <>{client.state} </>}
                {client.pincode}
                <br />
                {client.gstin && <>GSTIN: {client.gstin}</>}
              </div>
              <div>
                <strong>Place of Supply:</strong> {client.state}
                <br />
                {isGstInvoice && (
                  <><strong>Tax Type:</strong> {totals.isInterstate ? "IGST (Interstate)" : "CGST + SGST (Intrastate)"}</>
                )}
                {!isGstInvoice && (
                  <><strong>Invoice Type:</strong> Non-GST Invoice</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <Label className="text-base">Line Items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Label className="text-xs">Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                      data-testid={`input-item-description-${index}`}
                    />
                  </div>
                  {isGstInvoice && (
                    <div className="col-span-2">
                      <Label className="text-xs">HSN/SAC</Label>
                      <Input
                        value={item.hsnSac}
                        onChange={(e) => updateLineItem(item.id, 'hsnSac', e.target.value)}
                        placeholder="8501"
                        data-testid={`input-item-hsn-${index}`}
                      />
                    </div>
                  )}
                  <div className={isGstInvoice ? "col-span-1" : "col-span-2"}>
                    <Label className="text-xs">Qty *</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                      data-testid={`input-item-qty-${index}`}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                      placeholder="nos"
                      data-testid={`input-item-unit-${index}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Rate *</Label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, 'rate', e.target.value)}
                      data-testid={`input-item-rate-${index}`}
                    />
                  </div>
                  {isGstInvoice && (
                    <div className="col-span-1">
                      <Label className="text-xs">GST%</Label>
                      <Select
                        value={item.gstRate}
                        onValueChange={(value) => updateLineItem(item.id, 'gstRate', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="col-span-1">
                    <Label className="text-xs">Amount</Label>
                    <Input value={item.amount} disabled className="bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="col-span-1 flex items-end">
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Totals Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Discount:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-20"
                  data-testid="input-discount"
                />
                <span>%</span>
                <span className="font-semibold">₹{totals.discountAmount.toFixed(2)}</span>
              </div>
            </div>
            {isGstInvoice && (
              <div className="flex justify-between border-t pt-2">
                <span>Taxable Value:</span>
                <span className="font-semibold">₹{totals.taxableValue.toFixed(2)}</span>
              </div>
            )}
            {isGstInvoice && totals.isInterstate && (
              <div className="flex justify-between">
                <span>IGST ({totals.igst > 0 ? '12%' : '0%'}):</span>
                <span className="font-semibold">₹{totals.igst.toFixed(2)}</span>
              </div>
            )}
            {isGstInvoice && !totals.isInterstate && (
              <>
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span className="font-semibold">₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span className="font-semibold">₹{totals.sgst.toFixed(2)}</span>
                </div>
              </>
            )}
            {isGstInvoice && totals.totalTax > 0 && (
              <div className="flex justify-between border-t pt-2">
                <span>Total Tax:</span>
                <span className="font-semibold">₹{totals.totalTax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Grand Total:</span>
              <span>₹{totals.grandTotal.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {amountInWords()}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={() => createInvoiceMutation.mutate()}
            disabled={createInvoiceMutation.isPending}
            data-testid="button-save-invoice"
          >
            <Save className="h-4 w-4 mr-2" />
            {createInvoiceMutation.isPending ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
