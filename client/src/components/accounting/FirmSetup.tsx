import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Building2, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Firm {
  id: string;
  firmName: string;
  isGstRegistered: boolean;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export default function FirmSetup({ onFirmSelected }: { onFirmSelected: (firmId: string) => void }) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    firmName: "",
    isGstRegistered: false,
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const { data: firms = [], isLoading } = useQuery<Firm[]>({
    queryKey: ["/api/accounting/firms"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/accounting/firms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/firms"] });
      toast({ title: "Success", description: "Firm created successfully" });
      setIsCreating(false);
      setFormData({ firmName: "", isGstRegistered: false, gstin: "", pan: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create firm", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading firms...</div>;
  }

  return (
    <div className="space-y-6">
      {!isCreating && (
        <Button onClick={() => setIsCreating(true)} data-testid="button-create-firm">
          <Plus className="mr-2 h-4 w-4" />
          Create New Firm
        </Button>
      )}

      {isCreating && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="firmName">Firm Name *</Label>
                <Input
                  id="firmName"
                  data-testid="input-firm-name"
                  value={formData.firmName}
                  onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2 flex items-center space-x-3 p-4 border rounded-lg">
                <Switch
                  id="isGstRegistered"
                  checked={formData.isGstRegistered}
                  onCheckedChange={(checked) => setFormData({ ...formData, isGstRegistered: checked })}
                  data-testid="switch-gst-registered"
                />
                <Label htmlFor="isGstRegistered" className="cursor-pointer font-medium">
                  Is GST Registered?
                </Label>
              </div>

              {formData.isGstRegistered && (
                <div className="col-span-2">
                  <Label htmlFor="gstin">GSTIN *</Label>
                  <Input
                    id="gstin"
                    data-testid="input-gstin"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    maxLength={15}
                    required={formData.isGstRegistered}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  data-testid="input-pan"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  maxLength={10}
                  placeholder="AAAAA0000A"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Business Address</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    data-testid="input-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    data-testid="input-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    data-testid="input-state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    data-testid="input-pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    maxLength={6}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-firm">
                {createMutation.isPending ? "Saving..." : "Save Firm"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)} data-testid="button-cancel">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {firms.map((firm) => (
          <Card key={firm.id} className="p-4" data-testid={`card-firm-${firm.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">{firm.firmName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${firm.isGstRegistered ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {firm.isGstRegistered ? 'GST Registered' : 'Non-GST'}
                    </span>
                  </div>
                  {firm.isGstRegistered && firm.gstin && <p className="text-sm text-gray-600 mt-1">GSTIN: {firm.gstin}</p>}
                  {firm.email && <p className="text-sm text-gray-600">{firm.email}</p>}
                  {firm.phone && <p className="text-sm text-gray-600">{firm.phone}</p>}
                  {firm.address && <p className="text-sm text-gray-600">{firm.address}, {firm.city}, {firm.state} - {firm.pincode}</p>}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onFirmSelected(firm.id)}
                data-testid={`button-select-firm-${firm.id}`}
              >
                Select
              </Button>
            </div>
          </Card>
        ))}

        {firms.length === 0 && !isCreating && (
          <div className="text-center py-8 text-gray-500">
            No firms yet. Create your first firm to get started.
          </div>
        )}
      </div>
    </div>
  );
}
