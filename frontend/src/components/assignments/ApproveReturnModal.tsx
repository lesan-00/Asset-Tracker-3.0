import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NextLaptopStatus = "AVAILABLE" | "UNDER_REPAIR";

interface ApproveReturnModalProps {
  open: boolean;
  condition: string;
  accessories: string;
  note: string;
  nextLaptopStatus: NextLaptopStatus;
  submitting: boolean;
  onConditionChange: (value: string) => void;
  onAccessoriesChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onNextLaptopStatusChange: (value: NextLaptopStatus) => void;
  onSubmit: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ApproveReturnModal({
  open,
  condition,
  accessories,
  note,
  nextLaptopStatus,
  submitting,
  onConditionChange,
  onAccessoriesChange,
  onNoteChange,
  onNextLaptopStatusChange,
  onSubmit,
  onOpenChange,
}: ApproveReturnModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Return</DialogTitle>
        </DialogHeader>
        <Label>Final Condition</Label>
        <Input value={condition} onChange={(event) => onConditionChange(event.target.value)} />
        <Label>Accessories Returned</Label>
        <Input value={accessories} onChange={(event) => onAccessoriesChange(event.target.value)} />
        <Label>Decision Note</Label>
        <Textarea value={note} onChange={(event) => onNoteChange(event.target.value)} />
        <Label>Next Laptop Status</Label>
        <Select value={nextLaptopStatus} onValueChange={onNextLaptopStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="UNDER_REPAIR">Under Repair</SelectItem>
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={onSubmit}>
            {submitting ? "Saving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
