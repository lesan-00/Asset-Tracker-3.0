import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { assetsApi, Asset, AssetStatus, AssetType } from "@/lib/assetsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { InventoryTable } from "@/components/assets/InventoryTable";

const assetTypes: AssetType[] = [
  "LAPTOP",
  "PRINTER",
  "SWITCH",
  "ROUTER",
  "DESKTOP",
  "PDA",
  "HCS_CRANE_SCALE",
  "MOBILE_PHONE",
  "SYSTEM_UNIT",
  "MONITOR",
  "KEYBOARD",
  "MOUSE",
  "HEADSET",
];
const assetStatuses: AssetStatus[] = ["IN_STOCK", "ASSIGNED", "IN_REPAIR", "RETIRED"];

const formatAssetTypeLabel = (type: AssetType) =>
  type
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");

type AssetFormState = {
  assetTag: string;
  assetType: AssetType;
  brand: string;
  model: string;
  imeiNo: string;
  serialNumber: string;
  specifications: string;
  department: string;
  status: AssetStatus;
  location: string;
  purchaseDate: string;
  warrantyEndDate: string;
  notes: string;
};

const emptyForm: AssetFormState = {
  assetTag: "",
  assetType: "PRINTER",
  brand: "",
  model: "",
  imeiNo: "",
  serialNumber: "",
  specifications: "",
  department: "",
  status: "IN_STOCK",
  location: "",
  purchaseDate: "",
  warrantyEndDate: "",
  notes: "",
};

interface AssetsPageProps {
  defaultType?: AssetType | "all";
  title?: string;
  description?: string;
  hideTypeFilter?: boolean;
}

export default function Assets({
  defaultType = "all",
  title = "Assets",
  description = "Centralized inventory management and asset tracking.",
  hideTypeFilter = false,
}: AssetsPageProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">(defaultType);
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetFormState>({ ...emptyForm, assetType: defaultType === "all" ? "PRINTER" : defaultType });
  const [formError, setFormError] = useState<string | null>(null);
  const isMobilePhone = form.assetType === "MOBILE_PHONE";
  const normalizedImei = form.imeiNo.trim().replace(/[-\s]/g, "");

  const canSave =
    form.assetTag.trim().length > 0 &&
    form.brand.trim().length > 0 &&
    form.model.trim().length > 0 &&
    form.location.trim().length > 0 &&
    (!isMobilePhone || /^\d{14,16}$/.test(normalizedImei));

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetsApi.list({
        search: search || undefined,
        type: typeFilter,
        status: statusFilter,
        location: locationFilter === "all" ? undefined : locationFilter,
        page,
        pageSize,
      });
      setAssets(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssets();
  }, [search, typeFilter, statusFilter, locationFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, locationFilter]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const asset of assets) {
      if (asset.location) set.add(asset.location);
    }
    return Array.from(set).sort();
  }, [assets]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, assetType: defaultType === "all" ? "PRINTER" : defaultType });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setFormError(null);
    setForm({
      assetTag: asset.assetTag,
      assetType: asset.assetType,
      brand: asset.brand,
      model: asset.model,
      imeiNo: asset.imeiNo || "",
      serialNumber: asset.serialNumber || "",
      specifications: asset.specifications || "",
      department: asset.department || "",
      status: asset.status,
      location: asset.location,
      purchaseDate: asset.purchaseDate || "",
      warrantyEndDate: asset.warrantyEndDate || "",
      notes: asset.notes || "",
    });
    setFormOpen(true);
  };

  const saveAsset = async () => {
    if (!canSave) {
      setFormError(
        isMobilePhone
          ? "Asset Tag, Brand, Model, Location, and a valid IMEI (14-16 digits) are required for mobile phones."
          : "Asset Tag, Brand, Model, and Location are required."
      );
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        assetTag: form.assetTag.trim(),
        assetType: form.assetType,
        brand: form.brand.trim(),
        model: form.model.trim(),
        imeiNo: isMobilePhone ? normalizedImei || undefined : undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        specifications: form.specifications.trim() || undefined,
        department: form.department.trim() || undefined,
        status: form.status,
        location: form.location.trim(),
        purchaseDate: form.purchaseDate || undefined,
        warrantyEndDate: form.warrantyEndDate || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editing) {
        await assetsApi.update(editing.id, payload);
      } else {
        await assetsApi.create(payload as any);
      }

      toast({
        title: "Success",
        description: editing ? "Asset updated successfully" : "Asset created successfully",
      });
      setFormOpen(false);
      await loadAssets();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save asset",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async (asset: Asset) => {
    if (!window.confirm(`Delete asset ${asset.assetTag}?`)) return;
    try {
      const result = await assetsApi.remove(asset.id);
      const cleanup = result?.deleted;
      const cleanupSummary = cleanup
        ? `${cleanup.assignments} assignments, ${cleanup.issues} issues, ${cleanup.notifications} notifications, ${cleanup.activityLogs} activity logs`
        : "related records cleaned";
      toast({
        title: "Deleted",
        description: `Asset deleted permanently (${cleanupSummary}).`,
      });
      await loadAssets();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete asset",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Asset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset tag, IMEI, serial number, brand..."
          />
        </div>
        {!hideTypeFilter && (
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AssetType | "all")}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              {assetTypes.map((type) => (
                <SelectItem key={type} value={type}>{formatAssetTypeLabel(type)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AssetStatus | "all")}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {assetStatuses.map((status) => (
              <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>{location}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <InventoryTable
        rows={assets}
        loading={loading}
        canManage={isAdmin}
        onView={(asset) => navigate(`/assets/${asset.id}`)}
        onEdit={isAdmin ? openEdit : undefined}
        onDelete={isAdmin ? deleteAsset : undefined}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {assets.length} of {total} assets
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Prev
          </Button>
          <span>
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-1 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Asset Tag *</Label>
              <Input value={form.assetTag} onChange={(e) => setForm((s) => ({ ...s, assetTag: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.assetType} onValueChange={(value) => setForm((s) => ({ ...s, assetType: value as AssetType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type) => <SelectItem key={type} value={type}>{formatAssetTypeLabel(type)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Brand *</Label>
              <Input value={form.brand} onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Model *</Label>
              <Input value={form.model} onChange={(e) => setForm((s) => ({ ...s, model: e.target.value }))} />
            </div>
            {isMobilePhone && (
              <div className="space-y-1.5">
                <Label>IMEI No *</Label>
                <Input
                  value={form.imeiNo}
                  onChange={(e) => setForm((s) => ({ ...s, imeiNo: e.target.value }))}
                  placeholder="15-digit IMEI"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Serial Number</Label>
              <Input value={form.serialNumber} onChange={(e) => setForm((s) => ({ ...s, serialNumber: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((s) => ({ ...s, status: value as AssetStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assetStatuses.map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Specifications</Label>
              <Textarea value={form.specifications} onChange={(e) => setForm((s) => ({ ...s, specifications: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm((s) => ({ ...s, purchaseDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Warranty End Date</Label>
              <Input type="date" value={form.warrantyEndDate} onChange={(e) => setForm((s) => ({ ...s, warrantyEndDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </div>
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={saveAsset}
              disabled={saving || !canSave}
            >
              {saving ? "Saving..." : editing ? "Update Asset" : "Create Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
