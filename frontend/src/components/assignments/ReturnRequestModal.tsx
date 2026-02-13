import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReturnRequestModalProps {
  open: boolean;
  condition: string;
  accessories: string;
  submitting: boolean;
  onConditionChange: (value: string) => void;
  onAccessoriesChange: (value: string) => void;
  onSubmit: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ReturnRequestModal({
  open,
  condition,
  accessories,
  submitting,
  onConditionChange,
  onAccessoriesChange,
  onSubmit,
  onOpenChange,
}: ReturnRequestModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Return</DialogTitle>
        </DialogHeader>
        <Label>Return Condition</Label>
        <Input value={condition} onChange={(event) => onConditionChange(event.target.value)} />
        <Label>Accessories Returned</Label>
        <Input
          value={accessories}
          onChange={(event) => onAccessoriesChange(event.target.value)}
          placeholder="charger, bag"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={onSubmit}>
            {submitting ? "Saving..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
