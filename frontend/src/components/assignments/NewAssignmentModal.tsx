import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface LaptopOption {
  id: string;
  assetTag?: string;
  serialNumber: string;
  brand: string;
  model: string;
  status: string;
}

interface StaffOption {
  id: string;
  name: string;
  department: string;
}

interface CreateAssignmentPayload {
  laptopId: string;
  staffId: string;
  assignedDate: string;
  issueCondition?: Record<string, string>;
  accessoriesIssued?: string[];
  notes?: string;
}

interface NewAssignmentModalProps {
  open: boolean;
  busy: boolean;
  laptops: LaptopOption[];
  staff: StaffOption[];
  accessories: Array<{ id: string; name: string; type?: string; status?: string }>;
  accessoriesLoading: boolean;
  accessoriesError: string | null;
  onOpenChange: (open: boolean) => void;
  onRefreshAccessories: () => void;
  onSubmit: (payload: CreateAssignmentPayload) => void;
}

const ACCESSORY_OPTIONS = [
  "Charger / Power Adapter",
  "Laptop Bag",
  "Keyboard (external)",
  "Mouse (wired)",
  "Mouse (wireless)",
  "HDMI Cable",
  "USB-C Adapter",
];

export function NewAssignmentModal({
  open,
  busy,
  laptops,
  staff,
  accessories,
  accessoriesLoading,
  accessoriesError,
  onOpenChange,
  onRefreshAccessories,
  onSubmit,
}: NewAssignmentModalProps) {
  const [laptopId, setLaptopId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [issueCondition, setIssueCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);

  const toggleAccessory = (name: string, checked: boolean) => {
    if (checked) {
      setSelectedAccessories((current) => (current.includes(name) ? current : [...current, name]));
      return;
    }
    setSelectedAccessories((current) => current.filter((item) => item !== name));
  };

  const reset = () => {
    setLaptopId("");
    setStaffId("");
    setAssignedDate("");
    setIssueCondition("");
    setNotes("");
    setSelectedAccessories([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg overflow-visible">
        <DialogHeader>
          <DialogTitle>New Assignment</DialogTitle>
          <DialogDescription>Status starts as Pending Acceptance.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3 max-h-[70vh] overflow-y-auto pr-1"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              laptopId,
              staffId,
              assignedDate: new Date(assignedDate).toISOString(),
              issueCondition: issueCondition ? { summary: issueCondition } : undefined,
              accessoriesIssued: selectedAccessories,
              notes: notes || undefined,
            });
          }}
        >
          <div>
            <Label>Laptop</Label>
            <Select value={laptopId} onValueChange={setLaptopId}>
              <SelectTrigger>
                <SelectValue placeholder="Select laptop" />
              </SelectTrigger>
              <SelectContent>
                {laptops.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.brand} {item.model} ({item.assetTag || item.serialNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Receiver</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Issue Date</Label>
            <Input type="date" value={assignedDate} onChange={(event) => setAssignedDate(event.target.value)} />
          </div>

          <div>
            <Label>Issue Condition</Label>
            <Input value={issueCondition} onChange={(event) => setIssueCondition(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Accessories Issued</Label>
            <div className="space-y-2 rounded-md border p-3">
              {ACCESSORY_OPTIONS.map((name) => {
                const checked = selectedAccessories.includes(name);
                return (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleAccessory(name, value === true)}
                    />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
            {selectedAccessories.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedAccessories.length}
              </p>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !laptopId || !staffId || !assignedDate}>
              {busy ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
