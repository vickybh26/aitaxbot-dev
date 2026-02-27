import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Client {
  id: string;
  clientName: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface Firm {
  id: string;
  firmName: string;
  isGstRegistered: boolean;
}

export default function ClientManager({ firmId }: { firmId: string }) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const { data: firm } = useQuery<Firm>({
    queryKey: [`/api/accounting/firms/${firmId}`],
    enabled: !!firmId,
  });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: [`/api/accounting/firms/${firmId}/clients`],
    enabled: !!firmId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", `/api/accounting/firms/${firmId}/clients`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounting/firms/${firmId}/clients`] });
      toast({ title: "Success", description: "Client created successfully" });
      setIsCreating(false);
      setFormData({ clientName: "", gstin: "", pan: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" });
    },
  });

  if (!firmId) {
    return <div className="text-center py-8 text-gray-500">Please select a firm first</div>;
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading clients...</div>;
  }

  return (
    <div className="space-y-6">
      {!isCreating && (
        <Button onClick={() => setIsCreating(true)} data-testid="button-create-client">
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      )}

      {isCreating && (
        <Card className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Client Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Client Name *</Label>
                  <Input
                    data-testid="input-client-name"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                  />
                </div>

                {firm?.isGstRegistered && (
                  <div className="col-span-2">
                    <Label>Client GSTIN (if applicable)</Label>
                    <Input
                      data-testid="input-client-gstin"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      maxLength={15}
                      placeholder="22AAAAA0000A1Z5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for non-GST registered clients</p>
                  </div>
                )}

                <div>
                  <Label>PAN</Label>
                  <Input
                    data-testid="input-client-pan"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    maxLength={10}
                    placeholder="AAAAA0000A"
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    data-testid="input-client-email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    data-testid="input-client-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Client Address</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Address *</Label>
                  <Input
                    data-testid="input-client-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>City *</Label>
                  <Input
                    data-testid="input-client-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>State *</Label>
                  <Input
                    data-testid="input-client-state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g., Maharashtra, Delhi"
                    required
                  />
                </div>
                <div>
                  <Label>Pincode *</Label>
                  <Input
                    data-testid="input-client-pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    maxLength={6}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-client">
                Save Client
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="p-4" data-testid={`card-client-${client.id}`}>
            <div className="flex gap-3">
              <Users className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold">{client.clientName}</h3>
                {firm?.isGstRegistered && client.gstin && (
                  <p className="text-sm text-gray-600">GSTIN: {client.gstin}</p>
                )}
                {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
                {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
                {client.address && (
                  <p className="text-sm text-gray-600">
                    {client.address}, {client.city}, {client.state} - {client.pincode}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}

        {clients.length === 0 && !isCreating && (
          <div className="text-center py-8 text-gray-500">
            No clients yet. Add your first client to get started.
          </div>
        )}
      </div>
    </div>
  );
}
