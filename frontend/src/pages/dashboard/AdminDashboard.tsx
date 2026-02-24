import { useMemo, useState } from "react";
import { Activity, ArrowRightLeft, ChevronDown, PackagePlus, RefreshCcw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { assetsApi, type AssetStatus, type AssetType } from "@/lib/assetsApi";
import { dashboardApi, type DashboardSummary } from "@/lib/dashboardApi";
import { NewAssignmentModal } from "@/components/assignments/NewAssignmentModal";
import { useToast } from "@/hooks/use-toast";

type DashboardTab = "overview" | "laptops";
type Accessory = { id: string; name: string; type?: string; status?: string };
type AssetFormState = {
  assetTag: string;
  assetType: AssetType;
  brand: string;
  model: string;
  imeiNo: string;
  serialNumber: string;
  status: AssetStatus;
  location: string;
  department: string;
  specifications: string;
  notes: string;
};

const typeOrder: AssetType[] = [
  "LAPTOP",
  "DESKTOP",
  "MOBILE_PHONE",
  "PRINTER",
  "SWITCH",
  "ROUTER",
  "SYSTEM_UNIT",
  "MONITOR",
  "KEYBOARD",
  "MOUSE",
  "HEADSET",
];

const formatAssetTypeLabel = (type: string) =>
  type
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");

const emptyAssetForm: AssetFormState = {
  assetTag: "",
  assetType: "LAPTOP",
  brand: "",
  model: "",
  imeiNo: "",
  serialNumber: "",
  status: "IN_STOCK",
  location: "",
  department: "",
  specifications: "",
  notes: "",
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [expanded, setExpanded] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assetForm, setAssetForm] = useState<AssetFormState>(emptyAssetForm);
  const isMobilePhone = assetForm.assetType === "MOBILE_PHONE";
  const normalizedImei = assetForm.imeiNo.trim().replace(/[-\s]/g, "");
  const [assignmentContext, setAssignmentContext] = useState<{
    locations: string[];
    departments: string[];
    accessories: Accessory[];
    loading: boolean;
    error: string | null;
  }>({
    locations: [],
    departments: [],
    accessories: [],
    loading: false,
    error: null,
  });

  const summaryTypeFilter = activeTab === "laptops" ? "LAPTOP" : undefined;
  const summaryQueryKey = ["dashboard-summary", summaryTypeFilter || "ALL"];

  const summaryQuery = useQuery({
    queryKey: summaryQueryKey,
    queryFn: () => dashboardApi.getDashboardSummary({ type: summaryTypeFilter }),
    staleTime: 30_000,
  });

  const createAssetMutation = useMutation({
    mutationFn: () =>
      assetsApi.create({
        assetTag: assetForm.assetTag.trim(),
        assetType: assetForm.assetType,
        brand: assetForm.brand.trim(),
        model: assetForm.model.trim(),
        imeiNo: isMobilePhone ? normalizedImei || undefined : undefined,
        serialNumber: assetForm.serialNumber.trim() || undefined,
        status: assetForm.status,
        location: assetForm.location.trim(),
        department: assetForm.department.trim() || undefined,
        specifications: assetForm.specifications.trim() || undefined,
        notes: assetForm.notes.trim() || undefined,
      } as any),
    onSuccess: async () => {
      toast({ title: "Asset created", description: "Inventory has been updated." });
      setAssetDialogOpen(false);
      setAssetForm(emptyAssetForm);
      await queryClient.invalidateQueries({ queryKey: summaryQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (error) => {
      toast({
        title: "Create asset failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const summary = summaryQuery.data;
  const byStatus = summary?.byStatus ?? {};
  const byTypeList = useMemo(() => {
    const source = summary?.byType ?? {};
    return typeOrder
      .map((type) => ({ type, count: source[type] ?? 0 }))
      .filter((item) => item.count > 0 || activeTab === "overview");
  }, [summary, activeTab]);
  const maxTypeCount = Math.max(1, ...byTypeList.map((item) => item.count));
  const visibleActivity = expanded ? summary?.recentActivity ?? [] : (summary?.recentActivity ?? []).slice(0, 5);

  const canCreateAsset =
    assetForm.assetTag.trim().length > 0 &&
    assetForm.brand.trim().length > 0 &&
    assetForm.model.trim().length > 0 &&
    assetForm.location.trim().length > 0 &&
    (!isMobilePhone || /^\d{14,16}$/.test(normalizedImei));

  const openAssignmentDialog = async () => {
    setAssignmentDialogOpen(true);
    setAssignmentContext((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const assetsResponse = await assetsApi.list({ page: 1, pageSize: 100 });
      const locationSet = new Set<string>();
      const departmentSet = new Set<string>();
      for (const item of assetsResponse.data) {
        if (item.location?.trim()) locationSet.add(item.location.trim());
        if (item.department?.trim()) departmentSet.add(item.department.trim());
      }

      let accessories: Accessory[] = [];
      try {
        const accessoriesResponse = await apiClient.get<Accessory[]>("/accessories");
        accessories = Array.isArray((accessoriesResponse as any)?.data)
          ? ((accessoriesResponse as any).data as Accessory[])
          : [];
      } catch (error) {
        const status =
          error instanceof APIClientError ? error.status : Number((error as any)?.status || 0);
        if (status !== 404) {
          throw error;
        }
      }

      setAssignmentContext({
        locations: Array.from(locationSet).sort(),
        departments: Array.from(departmentSet).sort(),
        accessories,
        loading: false,
        error: null,
      });
    } catch (error) {
      setAssignmentContext((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load assignment context",
      }));
    }
  };

  const handleCreateAssignment = async (payload: unknown) => {
    try {
      await apiClient.post("/assignments", payload);
      toast({ title: "Assignment created", description: "Assignment is now pending acceptance." });
      setAssignmentDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: summaryQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch (error) {
      toast({
        title: "Create assignment failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 rounded-2xl border border-border/70 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 text-slate-100 shadow-xl md:p-6">
      <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-300">Overview of asset inventory and operational status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" className="gap-2" onClick={() => setAssetDialogOpen(true)}>
            <PackagePlus className="h-4 w-4" />
            Add Asset
          </Button>
          <Button type="button" className="gap-2" onClick={() => void openAssignmentDialog()}>
            <ArrowRightLeft className="h-4 w-4" />
            New Assignment
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="border border-white/20 text-slate-100 hover:bg-white/10"
            onClick={() => void summaryQuery.refetch()}
            disabled={summaryQuery.isFetching}
          >
            <RefreshCcw className={`h-4 w-4 ${summaryQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)}>
        <TabsList className="grid w-full max-w-xs grid-cols-2 bg-white/10 text-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="laptops">Laptops</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {summaryQuery.isLoading ? <DashboardLoading /> : null}

          {!summaryQuery.isLoading && summaryQuery.isError ? (
            <Card className="border-destructive/40 bg-destructive/10 text-destructive-foreground">
              <CardContent className="flex flex-col items-start gap-3 p-6">
                <p className="text-sm">
                  Failed to load dashboard data:{" "}
                  {summaryQuery.error instanceof Error ? summaryQuery.error.message : "Unknown error"}
                </p>
                <Button variant="outline" onClick={() => void summaryQuery.refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!summaryQuery.isLoading && !summaryQuery.isError && summary ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title={activeTab === "laptops" ? "Total Laptops" : "Total Assets"} value={summary.totalAssets} />
                <MetricCard title="In Stock" value={byStatus.IN_STOCK ?? 0} />
                <MetricCard title="Assigned" value={byStatus.ASSIGNED ?? 0} />
                <MetricCard title="In Repair" value={byStatus.IN_REPAIR ?? 0} />
              </div>

              <div className="flex items-center justify-end">
                <Badge variant="outline" className="border-white/20 bg-white/10 text-slate-100">
                  Retired: {byStatus.RETIRED ?? 0} assets
                </Badge>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-white/10 bg-white/5 text-slate-100 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <button
                      type="button"
                      aria-expanded={typesOpen}
                      aria-controls="assets-by-type-content"
                      onClick={() => setTypesOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-md p-1 text-left transition-colors hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Assets by Type</CardTitle>
                        <Badge variant="outline" className="border-white/20 bg-white/10 text-slate-100">
                          {summary.totalAssets}
                        </Badge>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-all duration-300 ${typesOpen ? "rotate-180" : ""}`} />
                    </button>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div
                      id="assets-by-type-content"
                      className={`grid overflow-hidden transition-all duration-300 ${
                        typesOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="min-h-0">
                        <div className="space-y-3 pb-2">
                          {byTypeList.map((item, index) => (
                            <div
                              key={item.type}
                              className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm animate-in fade-in-0 slide-in-from-bottom-1"
                              style={{ animationDelay: `${index * 35}ms` }}
                            >
                              <span className="truncate text-slate-200">{formatAssetTypeLabel(item.type)}</span>
                              <div className="h-2 rounded-full bg-white/15">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700"
                                  style={{ width: `${Math.max(6, Math.round((item.count / maxTypeCount) * 100))}%` }}
                                />
                              </div>
                              <Badge variant="secondary" className="bg-white/15 text-slate-100">
                                {item.count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 text-slate-100 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visibleActivity.length === 0 ? (
                      <p className="text-sm text-slate-300">No recent activity.</p>
                    ) : (
                      visibleActivity.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 rounded-md border border-white/10 bg-black/20 p-3">
                          <div className="mt-0.5 rounded-full bg-cyan-400/20 p-1 text-cyan-300">
                            <Activity className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-5 text-slate-100">{event.message}</p>
                            <p className="text-xs text-slate-400">{timeAgo(event.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                    {(summary.recentActivity?.length ?? 0) > 5 ? (
                      <div className="flex justify-center">
                        <Button type="button" variant="ghost" className="gap-2 text-slate-100 hover:bg-white/10" onClick={() => setExpanded((prev) => !prev)}>
                          {expanded ? "Show Less" : "Show More"}
                          <ChevronDown className={`h-4 w-4 transition-all duration-300 ${expanded ? "rotate-180" : ""}`} />
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Asset Tag *</Label>
              <Input value={assetForm.assetTag} onChange={(event) => setAssetForm((prev) => ({ ...prev, assetTag: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={assetForm.assetType} onValueChange={(value) => setAssetForm((prev) => ({ ...prev, assetType: value as AssetType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOrder.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatAssetTypeLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Brand *</Label>
              <Input value={assetForm.brand} onChange={(event) => setAssetForm((prev) => ({ ...prev, brand: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Model *</Label>
              <Input value={assetForm.model} onChange={(event) => setAssetForm((prev) => ({ ...prev, model: event.target.value }))} />
            </div>
            {isMobilePhone && (
              <div className="space-y-1.5">
                <Label>IMEI No *</Label>
                <Input
                  value={assetForm.imeiNo}
                  onChange={(event) => setAssetForm((prev) => ({ ...prev, imeiNo: event.target.value }))}
                  placeholder="15-digit IMEI"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Serial Number</Label>
              <Input value={assetForm.serialNumber} onChange={(event) => setAssetForm((prev) => ({ ...prev, serialNumber: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={assetForm.status} onValueChange={(value) => setAssetForm((prev) => ({ ...prev, status: value as AssetStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_STOCK">IN STOCK</SelectItem>
                  <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
                  <SelectItem value="IN_REPAIR">IN REPAIR</SelectItem>
                  <SelectItem value="RETIRED">RETIRED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Input value={assetForm.location} onChange={(event) => setAssetForm((prev) => ({ ...prev, location: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={assetForm.department} onChange={(event) => setAssetForm((prev) => ({ ...prev, department: event.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Specifications</Label>
              <Textarea rows={2} value={assetForm.specifications} onChange={(event) => setAssetForm((prev) => ({ ...prev, specifications: event.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={assetForm.notes} onChange={(event) => setAssetForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canCreateAsset || createAssetMutation.isPending}
              onClick={() => createAssetMutation.mutate()}
            >
              {createAssetMutation.isPending ? "Creating..." : "Create Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewAssignmentModal
        open={assignmentDialogOpen}
        busy={false}
        locations={assignmentContext.locations}
        departments={assignmentContext.departments}
        accessories={assignmentContext.accessories}
        accessoriesLoading={assignmentContext.loading}
        accessoriesError={assignmentContext.error}
        onOpenChange={setAssignmentDialogOpen}
        onRefreshAccessories={() => void openAssignmentDialog()}
        onSubmit={(payload) => {
          void handleCreateAssignment(payload);
        }}
      />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-white/10 bg-white/5 text-slate-100 shadow-sm backdrop-blur-sm transition-all hover:bg-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-3xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 w-full bg-white/10" />
        <Skeleton className="h-28 w-full bg-white/10" />
        <Skeleton className="h-28 w-full bg-white/10" />
        <Skeleton className="h-28 w-full bg-white/10" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 w-full bg-white/10" />
        <Skeleton className="h-80 w-full bg-white/10" />
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
