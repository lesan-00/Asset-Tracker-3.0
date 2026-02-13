import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/apiClient";

interface LaptopDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laptop: { id: string; assetTag: string } | null;
  onSuccess: () => void;
}

export const LaptopDeleteDialog: React.FC<LaptopDeleteDialogProps> = ({
  open,
  onOpenChange,
  laptop,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!laptop) return;

    setLoading(true);
    try {
      await apiClient.delete(`/laptops/${laptop.id}`);

      toast({
        title: "Success",
        description: "Laptop deleted successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete laptop",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Laptop</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete laptop{" "}
            <strong>{laptop?.assetTag}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
