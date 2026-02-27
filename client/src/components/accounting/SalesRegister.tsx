import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SalesRegisterEntry {
  id: string;
  firmId: string;
  month: string;
  year: number;
  totalInvoices: number;
  totalSales: string;
  totalCgst: string;
  totalSgst: string;
  totalIgst: string;
  totalTax: string;
  grandTotal: string;
  invoiceIds: string[];
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

export default function SalesRegister({ firmId }: { firmId: string }) {
  const { getIdToken } = useAuth();

  const { data: registers = [], isLoading, error } = useQuery<SalesRegisterEntry[]>({
    queryKey: [`/api/accounting/sales-registers/${firmId}`],
    enabled: !!firmId,
    queryFn: async () => {
      const token = await getIdToken();
      const response = await fetch(`/api/accounting/sales-registers/${firmId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch sales registers');
      return response.json();
    }
  });

  if (!firmId) {
    return <div className="text-center py-8 text-gray-500">Please select a firm first</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading sales register...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading sales register. Please try again.
      </div>
    );
  }

  const totalSales = registers.reduce((sum, r) => sum + parseFloat(r.totalSales || '0'), 0);
  const totalTax = registers.reduce((sum, r) => sum + parseFloat(r.totalTax || '0'), 0);
  const totalInvoices = registers.reduce((sum, r) => sum + (r.totalInvoices || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total GST Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalTax)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalInvoices}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Monthly Sales Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sales data yet.</p>
              <p className="text-sm mt-2">Create invoices to see your sales register here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
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
                    <TableCell className="text-right">{register.totalInvoices}</TableCell>
                    <TableCell className="text-right">{formatCurrency(register.totalSales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(register.totalCgst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(register.totalSgst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(register.totalIgst)}</TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatCurrency(register.totalTax)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
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
