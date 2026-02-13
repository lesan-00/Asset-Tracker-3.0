import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TermsModalProps {
  open: boolean;
  terms: string[];
  checked: boolean[];
  onCheckedChange: (index: number, value: boolean) => void;
  canAccept: boolean;
  submitting: boolean;
  onAccept: () => void;
  onOpenChange: (open: boolean) => void;
}

export function TermsModal({
  open,
  terms,
  checked,
  onCheckedChange,
  canAccept,
  submitting,
  onAccept,
  onOpenChange,
}: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review and Accept Assignment</DialogTitle>
          <DialogDescription>
            You must agree to all required terms. If you disagree, refuse the assignment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {terms.map((term, index) => (
            <div key={term} className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                checked={checked[index]}
                onCheckedChange={(value) => onCheckedChange(index, value === true)}
              />
              <Label className="font-normal">{term}</Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canAccept || submitting} onClick={onAccept}>
            {submitting ? "Saving..." : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
