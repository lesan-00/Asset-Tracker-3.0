import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RefuseModalProps {
  open: boolean;
  reason: string;
  submitting: boolean;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  onOpenChange: (open: boolean) => void;
}

export function RefuseModal({
  open,
  reason,
  submitting,
  onReasonChange,
  onSubmit,
  onOpenChange,
}: RefuseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuse Assignment</DialogTitle>
        </DialogHeader>
        <Label>Reason (optional)</Label>
        <Textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={submitting} onClick={onSubmit}>
            {submitting ? "Saving..." : "Refuse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
