import { Button } from "@/components/ui/button";
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

interface RejectReturnModalProps {
  open: boolean;
  reason: string;
  submitting: boolean;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  onOpenChange: (open: boolean) => void;
}

export function RejectReturnModal({
  open,
  reason,
  submitting,
  onReasonChange,
  onSubmit,
  onOpenChange,
}: RejectReturnModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Return</DialogTitle>
          <DialogDescription>Reason is required.</DialogDescription>
        </DialogHeader>
        <Label>Reason</Label>
        <Textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!reason.trim() || submitting} onClick={onSubmit}>
            {submitting ? "Saving..." : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
