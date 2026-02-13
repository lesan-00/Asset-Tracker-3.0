import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/apiClient";
import { departments } from "@/data/mockData";
import { Laptop, LaptopStatus } from "@/types";

interface LaptopFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laptop?: Laptop | null;
  onSuccess: () => void;
}

export const LaptopFormModal: React.FC<LaptopFormModalProps> = ({
  open,
  onOpenChange,
  laptop,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Laptop>>(
    laptop || {
      assetTag: "",
      brand: "",
      model: "",
      serialNumber: "",
      specifications: { cpu: "", ram: "", storage: "" },
      status: "AVAILABLE" as LaptopStatus,
      department: "",
      warrantyExpiry: "",
      purchaseDate: "",
      purchasePrice: 0,
      notes: "",
    }
  );

  React.useEffect(() => {
    if (laptop) {
      setFormData(laptop);
    }
  }, [laptop]);

  const handleInputChange = (
    field: string,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSpecChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.assetTag ||
      !formData.brand ||
      !formData.model ||
      !formData.serialNumber ||
      !formData.department
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Convert dates to ISO format for API
      const purchaseDate = formData.purchaseDate
        ? new Date(formData.purchaseDate).toISOString()
        : laptop
          ? undefined
          : new Date().toISOString();
      const warrantyExpiry = formData.warrantyExpiry
        ? new Date(formData.warrantyExpiry).toISOString()
        : laptop
          ? undefined
          : new Date().toISOString();

      const submitData = Object.fromEntries(
        Object.entries({
          ...formData,
          purchaseDate,
          warrantyExpiry,
          notes: formData.notes ?? undefined,
        }).filter(([, value]) => value !== undefined && value !== null)
      );

      if (laptop) {
        // Edit
        await apiClient.put(`/laptops/${laptop.id}`, submitData);
        toast({
          title: "Success",
          description: "Laptop updated successfully",
        });
      } else {
        // Create
        await apiClient.post("/laptops", submitData);
        toast({
          title: "Success",
          description: "Laptop added successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
      setFormData({
        assetTag: "",
        brand: "",
        model: "",
        serialNumber: "",
        specifications: { cpu: "", ram: "", storage: "" },
        status: "AVAILABLE" as LaptopStatus,
        department: "",
        warrantyExpiry: "",
        purchaseDate: "",
        purchasePrice: 0,
        notes: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save laptop",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{laptop ? "Edit Laptop" : "Add New Laptop"}</DialogTitle>
          <DialogDescription>
            {laptop
              ? "Update the laptop information below"
              : "Enter the details of the new laptop"}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset & Device Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assetTag">Asset Tag *</Label>
              <Input
                id="assetTag"
                value={formData.assetTag || ""}
                onChange={(e) => handleInputChange("assetTag", e.target.value)}
                placeholder="LAP-001"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number *</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber || ""}
                onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                placeholder="ABC123XYZ"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                value={formData.brand || ""}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                placeholder="Dell, HP, Lenovo"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model || ""}
                onChange={(e) => handleInputChange("model", e.target.value)}
                placeholder="XPS 15, ProBook 450"
                disabled={loading}
              />
            </div>
          </div>

          {/* Specifications */}
          <div>
            <h3 className="font-medium mb-3">Specifications</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cpu">CPU</Label>
                <Input
                  id="cpu"
                  value={formData.specifications?.cpu || ""}
                  onChange={(e) => handleSpecChange("cpu", e.target.value)}
                  placeholder="Intel i7"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="ram">RAM</Label>
                <Input
                  id="ram"
                  value={formData.specifications?.ram || ""}
                  onChange={(e) => handleSpecChange("ram", e.target.value)}
                  placeholder="16GB"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="storage">Storage</Label>
                <Input
                  id="storage"
                  value={formData.specifications?.storage || ""}
                  onChange={(e) => handleSpecChange("storage", e.target.value)}
                  placeholder="512GB SSD"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Status & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || "AVAILABLE"}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger disabled={loading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="MAINTENANCE">Under Repair</SelectItem>
                  <SelectItem value="LOST">Lost/Stolen</SelectItem>
                  <SelectItem value="RETIRED">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department || ""}
                onValueChange={(value) => handleInputChange("department", value)}
              >
                <SelectTrigger disabled={loading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate || ""}
                onChange={(e) => handleInputChange("purchaseDate", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes..."
              disabled={loading}
            />
          </div>
        </form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} onClick={handleSubmit}>
            {loading ? "Saving..." : laptop ? "Update Laptop" : "Add Laptop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
