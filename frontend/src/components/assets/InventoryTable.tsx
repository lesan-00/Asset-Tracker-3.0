import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Asset } from "@/lib/assetsApi";

function formatSpecifications(spec: string | null | undefined): string {
  if (!spec) {
    return "-";
  }

  try {
    const parsed = JSON.parse(spec) as Record<string, unknown>;
    const values = Object.values(parsed)
      .map((value) => String(value).trim())
      .filter(Boolean);

    return values.length > 0 ? values.join(" • ") : "-";
  } catch {
    return "-";
  }
}

interface InventoryTableProps {
  rows: Asset[];
  loading?: boolean;
  canManage?: boolean;
  onView: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
}

export function InventoryTable({
  rows,
  loading = false,
  canManage = false,
  onView,
  onEdit,
  onDelete,
}: InventoryTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Asset Tag</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>IMEI</TableHead>
            <TableHead>Serial</TableHead>
            <TableHead>Specifications</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                Loading assets...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                No assets found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.assetTag}</TableCell>
                <TableCell>{asset.assetType}</TableCell>
                <TableCell>{asset.brand}</TableCell>
                <TableCell>{asset.model}</TableCell>
                <TableCell className="font-mono text-xs">{asset.imeiNo || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{asset.serialNumber || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatSpecifications(asset.specifications)}
                </TableCell>
                <TableCell>{asset.department || "-"}</TableCell>
                <TableCell>{asset.location}</TableCell>
                <TableCell>
                  <Badge variant={asset.status === "IN_STOCK" ? "secondary" : asset.status === "RETIRED" ? "outline" : "default"}>
                    {asset.status.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => onView(asset)} className="gap-2">
                        <Eye className="h-4 w-4" /> View
                      </DropdownMenuItem>
                      {canManage && onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(asset)} className="gap-2">
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      )}
                      {canManage && onDelete && (
                        <DropdownMenuItem onClick={() => onDelete(asset)} className="gap-2 text-destructive">
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
