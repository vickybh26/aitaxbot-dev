import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, ShoppingCart, Plus, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PurchaseEntry {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  cgst: string;
  sgst: string;
  igst: string;
  totalTax: string;
  grandTotal: string;
}

interface PurchaseRegisterEntry {
  id: string;
  firmId: string;
  month: string;
  year: number;
  totalPurchases: number;
  totalAmount: string;
  totalCgst: string;
  totalSgst: string;
  totalIgst: string;
  totalTax: string;
  grandTotal: string;
  purchases: PurchaseEntry[];
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num || 0);
}

function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function PurchaseRegister({ firmId }: { firmId: string }) {
  const { getIdToken } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    vendorName: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    amount: '',
    gstRate: '18',
    isInterstate: false
  });

  const { data: registers = [], isLoading, error } = useQuery<PurchaseRegisterEntry[]>({
    queryKey: [`/api/accounting/purchase-registers/${firmId}`],
    enabled: !!firmId,
    queryFn: async () => {
      const token = await getIdToken();
      const response = await fetch(`/api/accounting/purchase-registers/${firmId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch purchase registers');
      return response.json();
    }
  });

  const addPurchaseMutation = useMutation({
    mutationFn: async (purchaseData: typeof newPurchase) => {
      const token = await getIdToken();
      const amount = parseFloat(purchaseData.amount);
      const gstRate = parseFloat(purchaseData.gstRate);
      const taxAmount = (amount * gstRate) / 100;
      const cgst = purchaseData.isInterstate ? 0 : taxAmount / 2;
      const sgst = purchaseData.isInterstate ? 0 : taxAmount / 2;
      const igst = purchaseData.isInterstate ? taxAmount : 0;
      
      const month = purchaseData.invoiceDate.substring(0, 7);
      
      const response = await fetch(`/api/accounting/purchase-register/${firmId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month,
          purchases: [{
            id: Date.now().toString(),
            vendorName: purchaseData.vendorName,
            invoiceNumber: purchaseData.invoiceNumber,
            invoiceDate: purchaseData.invoiceDate,
            amount: amount.toString(),
            cgst: cgst.toString(),
            sgst: sgst.toString(),
            igst: igst.toString(),
            totalTax: taxAmount.toString(),
            grandTotal: (amount + taxAmount).toString()
          }],
          totalPurchases: 1,
          totalAmount: amount.toString(),
          totalCgst: cgst.toString(),
          totalSgst: sgst.toString(),
          totalIgst: igst.toString(),
          totalTax: taxAmount.toString(),
          grandTotal: (amount + taxAmount).toString()
        })
      });
      
      if (!response.ok) throw new Error('Failed to add purchase');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounting/purchase-registers/${firmId}`] });
      toast({ title: "Success", description: "Purchase added successfully" });
      setIsDialogOpen(false);
      setNewPurchase({
        vendorName: '',
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        amount: '',
        gstRate: '18',
        isInterstate: false
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  if (!firmId) {
    return <div className="text-center py-8 text-gray-500">Please select a firm first</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading purchase register...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading purchase register. Please try again.
      </div>
    );
  }

  const totalPurchases = registers.reduce((sum, r) => sum + parseFloat(r.totalAmount || '0'), 0);
  const totalTax = registers.reduce((sum, r) => sum + parseFloat(r.totalTax || '0'), 0);
  const totalEntries = registers.reduce((sum, r) => sum + (r.totalPurchases || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Purchase Register</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Purchase
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Purchase Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vendor Name</Label>
                <Input
                  value={newPurchase.vendorName}
                  onChange={(e) => setNewPurchase({ ...newPurchase, vendorName: e.target.value })}
                  placeholder="Enter vendor name"
                />
              </div>
              <div>
                <Label>Invoice Number</Label>
                <Input
                  value={newPurchase.invoiceNumber}
                  onChange={(e) => setNewPurchase({ ...newPurchase, invoiceNumber: e.target.value })}
                  placeholder="Enter invoice number"
                />
              </div>
              <div>
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={newPurchase.invoiceDate}
                  onChange={(e) => setNewPurchase({ ...newPurchase, invoiceDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount (Taxable Value)</Label>
                <Input
                  type="number"
                  value={newPurchase.amount}
                  onChange={(e) => setNewPurchase({ ...newPurchase, amount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label>GST Rate (%)</Label>
                <Input
                  type="number"
                  value={newPurchase.gstRate}
                  onChange={(e) => setNewPurchase({ ...newPurchase, gstRate: e.target.value })}
                  placeholder="18"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isInterstate"
                  checked={newPurchase.isInterstate}
                  onChange={(e) => setNewPurchase({ ...newPurchase, isInterstate: e.target.checked })}
                />
                <Label htmlFor="isInterstate">Interstate Purchase (IGST)</Label>
              </div>
              <Button 
                onClick={() => addPurchaseMutation.mutate(newPurchase)}
                disabled={addPurchaseMutation.isPending}
                className="w-full"
              >
                {addPurchaseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Purchase'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalPurchases)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Input GST Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalTax)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalEntries}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Monthly Purchase Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase data yet.</p>
              <p className="text-sm mt-2">Add purchases to see your purchase register here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Taxable Value</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">Total Tax</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registers.map((register) => (
                  <TableRow key={register.id}>
                    <TableCell className="font-medium">{formatMonth(register.month)}</TableCell>
                    <TableCell className="text-right">{register.totalPurchases}</TableCell>
                    <TableCell className="text-right">{formatCurrency(register.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(register.totalCgst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(register.totalSgst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(register.totalIgst)}</TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatCurrency(register.totalTax)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {formatCurrency(register.grandTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
