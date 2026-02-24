import { useState, type ComponentType, type ReactNode } from "react";
import {
  Archive,
  Download,
  FileText,
  History,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { reportsApi, type IssueSummaryResponse, type ReportFormat } from "@/lib/reportsApi";
import { assetsApi, type AssetImportPreview } from "@/lib/assetsApi";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { importsApi, type ImportResponse } from "@/lib/importsApi";

type PreviewType = "asset-register" | "active-assignments" | "issue-summary" | "assignment-history";

export default function Reports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<PreviewType | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewRows, setPreviewRows] = useState<Array<Record<string, unknown>>>([]);
  const [previewIssueSummary, setPreviewIssueSummary] = useState<IssueSummaryResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [assetFilters, setAssetFilters] = useState({
    type: "",
    status: "",
    location: "",
    department: "",
    search: "",
  });

  const [activeAssignmentFilters, setActiveAssignmentFilters] = useState({
    targetType: "",
    search: "",
  });

  const [historyFilters, setHistoryFilters] = useState({
    from: "",
    to: "",
    search: "",
  });

  const [issueFilters, setIssueFilters] = useState({
    from: "",
    to: "",
  });
  const [assetImportOpen, setAssetImportOpen] = useState(false);
  const [assetImportFile, setAssetImportFile] = useState<File | null>(null);
  const [assetImportBase64, setAssetImportBase64] = useState("");
  const [assetImportPreview, setAssetImportPreview] = useState<AssetImportPreview | null>(null);
  const [assetImportLoading, setAssetImportLoading] = useState(false);
  const [assetImporting, setAssetImporting] = useState(false);
  const [assetImportError, setAssetImportError] = useState<string | null>(null);
  const [staffImportOpen, setStaffImportOpen] = useState(false);
  const [staffImportFile, setStaffImportFile] = useState<File | null>(null);
  const [staffImportBase64, setStaffImportBase64] = useState("");
  const [staffImportPreview, setStaffImportPreview] = useState<ImportResponse | null>(null);
  const [staffImportLoading, setStaffImportLoading] = useState(false);
  const [staffImporting, setStaffImporting] = useState(false);
  const [staffImportError, setStaffImportError] = useState<string | null>(null);

  const exportWithToast = async (
    key: string,
    label: string,
    format: ReportFormat,
    runner: () => Promise<void>
  ) => {
    const actionKey = `${key}:${format}`;
    setBusyKey(actionKey);
    try {
      await runner();
      toast({
        title: "Report Downloaded",
        description: `${label} exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Could not download report",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const openPreview = async (type: PreviewType, title: string) => {
    setBusyKey(`${type}:preview`);
    setPreviewType(type);
    setPreviewTitle(title);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewRows([]);
    setPreviewIssueSummary(null);

    try {
      if (type === "asset-register") {
        const response = await reportsApi.getAssetRegister(assetFilters);
        const rows = Array.isArray((response as any)?.data) ? (response as any).data : [];
        setPreviewRows(rows.slice(0, 100));
        return;
      }
      if (type === "active-assignments") {
        const response = await reportsApi.getActiveAssignments(activeAssignmentFilters);
        const rows = Array.isArray((response as any)?.data) ? (response as any).data : [];
        setPreviewRows(rows.slice(0, 100));
        return;
      }
      if (type === "assignment-history") {
        const response = await reportsApi.getAssignmentHistory(historyFilters);
        const rows = Array.isArray((response as any)?.data) ? (response as any).data : [];
        setPreviewRows(rows.slice(0, 100));
        return;
      }

      const response = await reportsApi.getIssueSummary(issueFilters);
      const summary = ((response as any)?.data ?? null) as IssueSummaryResponse | null;
      setPreviewIssueSummary(summary);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Failed to load report preview");
    } finally {
      setPreviewLoading(false);
      setBusyKey(null);
    }
  };

  const handleFileSelect = async (file: File | null) => {
    setAssetImportFile(file);
    setAssetImportPreview(null);
    setAssetImportError(null);
    setAssetImportBase64("");
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setAssetImportBase64(base64);
    } catch {
      setAssetImportError("Failed to read file.");
    }
  };

  const downloadAssetTemplate = async () => {
    try {
      const csv = await assetsApi.downloadImportTemplate();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "asset-import-template.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Template download failed",
        description: error instanceof Error ? error.message : "Could not download template",
        variant: "destructive",
      });
    }
  };

  const previewAssetImport = async () => {
    if (!assetImportFile || !assetImportBase64) {
      setAssetImportError("Select a CSV/Excel file first.");
      return;
    }
    setAssetImportLoading(true);
    setAssetImportError(null);
    setAssetImportPreview(null);
    try {
      const preview = await assetsApi.previewImport(assetImportFile.name, assetImportBase64);
      setAssetImportPreview(preview);
    } catch (error) {
      setAssetImportError(error instanceof Error ? error.message : "Preview failed");
    } finally {
      setAssetImportLoading(false);
    }
  };

  const confirmAssetImport = async () => {
    if (!assetImportFile || !assetImportBase64) {
      setAssetImportError("Select a file and run preview first.");
      return;
    }
    setAssetImporting(true);
    setAssetImportError(null);
    try {
      const result = await assetsApi.importAssets(assetImportFile.name, assetImportBase64);
      toast({
        title: "Asset import completed",
        description: `Inserted ${result.insertedCount} records. ${result.failedCount > 0 ? `${result.failedCount} failed.` : ""}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setAssetImportOpen(false);
      setAssetImportFile(null);
      setAssetImportBase64("");
      setAssetImportPreview(null);
    } catch (error) {
      setAssetImportError(error instanceof Error ? error.message : "Import failed");
    } finally {
      setAssetImporting(false);
    }
  };

  const handleStaffFileSelect = async (file: File | null) => {
    setStaffImportFile(file);
    setStaffImportPreview(null);
    setStaffImportError(null);
    setStaffImportBase64("");
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setStaffImportBase64(base64);
    } catch {
      setStaffImportError("Failed to read file.");
    }
  };

  const downloadStaffTemplate = async () => {
    try {
      const csv = await importsApi.downloadStaffTemplate();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "staff-import-template.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Template download failed",
        description: error instanceof Error ? error.message : "Could not download template",
        variant: "destructive",
      });
    }
  };

  const previewStaffImport = async () => {
    if (!staffImportFile || !staffImportBase64) {
      setStaffImportError("Select a CSV/Excel file first.");
      return;
    }
    setStaffImportLoading(true);
    setStaffImportError(null);
    setStaffImportPreview(null);
    try {
      const preview = await importsApi.previewStaff(staffImportFile.name, staffImportBase64);
      setStaffImportPreview(preview);
    } catch (error) {
      setStaffImportError(error instanceof Error ? error.message : "Preview failed");
    } finally {
      setStaffImportLoading(false);
    }
  };

  const confirmStaffImport = async () => {
    if (!staffImportFile || !staffImportBase64) {
      setStaffImportError("Select a file and run preview first.");
      return;
    }
    setStaffImporting(true);
    setStaffImportError(null);
    try {
      const result = await importsApi.confirmStaff(staffImportFile.name, staffImportBase64);
      toast({
        title: "Staff import completed",
        description: `Inserted ${result.summary.insertedRows ?? result.summary.validRows} records.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
      setStaffImportOpen(false);
      setStaffImportFile(null);
      setStaffImportBase64("");
      setStaffImportPreview(null);
    } catch (error) {
      setStaffImportError(error instanceof Error ? error.message : "Import failed");
    } finally {
      setStaffImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_60%)]" />
        <div className="relative space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate operational and inventory performance reports.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportPanel
          icon={Archive}
          title="Full Asset Register"
          description="Complete asset inventory with type, specs, department, status, and lifecycle dates."
          actions={
            <ReportActions
              busyKey={busyKey}
              reportKey="asset-register"
              onView={() => void openPreview("asset-register", "Full Asset Register Preview")}
              onExcel={() =>
                exportWithToast("asset-register", "Full Asset Register", "xlsx", () =>
                  reportsApi.exportAssetRegister(assetFilters, "xlsx")
                )
              }
              onPdf={() =>
                exportWithToast("asset-register", "Full Asset Register", "pdf", () =>
                  reportsApi.exportAssetRegister(assetFilters, "pdf")
                )
              }
            />
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Search by tag, serial, brand..."
              value={assetFilters.search}
              onChange={(e) => setAssetFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <Input
              placeholder="Type (LAPTOP/PRINTER...)"
              value={assetFilters.type}
              onChange={(e) => setAssetFilters((prev) => ({ ...prev, type: e.target.value.toUpperCase() }))}
            />
            <Input
              placeholder="Status (IN_STOCK, ASSIGNED...)"
              value={assetFilters.status}
              onChange={(e) => setAssetFilters((prev) => ({ ...prev, status: e.target.value.toUpperCase() }))}
            />
            <Input
              placeholder="Department"
              value={assetFilters.department}
              onChange={(e) => setAssetFilters((prev) => ({ ...prev, department: e.target.value }))}
            />
            <Input
              placeholder="Location"
              value={assetFilters.location}
              onChange={(e) => setAssetFilters((prev) => ({ ...prev, location: e.target.value }))}
            />
          </div>
        </ReportPanel>

        <ReportPanel
          icon={UsersRound}
          title="Active Assignments"
          description="Only active custody or deployment records with asset details and issued accessories."
          actions={
            <ReportActions
              busyKey={busyKey}
              reportKey="active-assignments"
              onView={() => void openPreview("active-assignments", "Active Assignments Preview")}
              onExcel={() =>
                exportWithToast("active-assignments", "Active Assignments", "xlsx", () =>
                  reportsApi.exportActiveAssignments(activeAssignmentFilters, "xlsx")
                )
              }
              onPdf={() =>
                exportWithToast("active-assignments", "Active Assignments", "pdf", () =>
                  reportsApi.exportActiveAssignments(activeAssignmentFilters, "pdf")
                )
              }
            />
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Target Type (STAFF/LOCATION/DEPARTMENT)"
              value={activeAssignmentFilters.targetType}
              onChange={(e) =>
                setActiveAssignmentFilters((prev) => ({
                  ...prev,
                  targetType: e.target.value.toUpperCase(),
                }))
              }
            />
            <Input
              placeholder="Search by asset, assignee, location..."
              value={activeAssignmentFilters.search}
              onChange={(e) =>
                setActiveAssignmentFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
        </ReportPanel>

        <ReportPanel
          icon={ShieldAlert}
          title="Issue Summary"
          description="Aggregated issue intelligence by category, status, asset type, and problematic assets."
          actions={
            <ReportActions
              busyKey={busyKey}
              reportKey="issue-summary"
              onView={() => void openPreview("issue-summary", "Issue Summary Preview")}
              onExcel={() =>
                exportWithToast("issue-summary", "Issue Summary", "xlsx", () =>
                  reportsApi.exportIssueSummary(issueFilters, "xlsx")
                )
              }
              onPdf={() =>
                exportWithToast("issue-summary", "Issue Summary", "pdf", () =>
                  reportsApi.exportIssueSummary(issueFilters, "pdf")
                )
              }
            />
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</p>
              <Input
                type="date"
                value={issueFilters.from}
                onChange={(e) => setIssueFilters((prev) => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</p>
              <Input
                type="date"
                value={issueFilters.to}
                onChange={(e) => setIssueFilters((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>
        </ReportPanel>

        <ReportPanel
          icon={History}
          title="Assignment History"
          description="Full assignment timeline including issue, acceptance, return, rejection, and revert events."
          actions={
            <ReportActions
              busyKey={busyKey}
              reportKey="assignment-history"
              onView={() => void openPreview("assignment-history", "Assignment History Preview")}
              onExcel={() =>
                exportWithToast("assignment-history", "Assignment History", "xlsx", () =>
                  reportsApi.exportAssignmentHistory(historyFilters, "xlsx")
                )
              }
              onPdf={() =>
                exportWithToast("assignment-history", "Assignment History", "pdf", () =>
                  reportsApi.exportAssignmentHistory(historyFilters, "pdf")
                )
              }
            />
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</p>
              <Input
                type="date"
                value={historyFilters.from}
                onChange={(e) => setHistoryFilters((prev) => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</p>
              <Input
                type="date"
                value={historyFilters.to}
                onChange={(e) => setHistoryFilters((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <Input
              className="self-end"
              placeholder="Search by assignment, asset, staff..."
              value={historyFilters.search}
              onChange={(e) => setHistoryFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </ReportPanel>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Import</CardTitle>
          <CardDescription>Import asset or staff master data from CSV/Excel files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setAssetImportOpen(true)}>
              <FileText className="h-4 w-4" />
              Import Assets
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setStaffImportOpen(true)}>
              <FileText className="h-4 w-4" />
              Import Staff
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>
              Live backend preview. Showing up to 100 rows for table-based reports.
            </DialogDescription>
          </DialogHeader>

          {previewLoading && (
            <div className="rounded-md border p-8 text-center text-muted-foreground">Loading preview...</div>
          )}

          {!previewLoading && previewError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {previewError}
            </div>
          )}

          {!previewLoading && !previewError && previewType === "issue-summary" && (
            <IssueSummaryPreview summary={previewIssueSummary} />
          )}

          {!previewLoading && !previewError && previewType !== "issue-summary" && (
            <TablePreview rows={previewRows} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={assetImportOpen} onOpenChange={setAssetImportOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Asset Master Data</DialogTitle>
            <DialogDescription>
              Upload CSV/Excel with required <code>asset_type</code> column. Supported: LAPTOP, DESKTOP, MOBILE_PHONE, PRINTER, SWITCH, ROUTER, MONITOR, KEYBOARD, MOUSE, HEADSET, SYSTEM_UNIT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={downloadAssetTemplate}>
                Download Template
              </Button>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleFileSelect(file);
                }}
              />
              <Button type="button" onClick={() => void previewAssetImport()} disabled={assetImportLoading || !assetImportFile}>
                {assetImportLoading ? "Previewing..." : "Preview"}
              </Button>
              <Button
                type="button"
                onClick={() => void confirmAssetImport()}
                disabled={
                  assetImporting ||
                  !assetImportPreview ||
                  assetImportPreview.invalidCount > 0 ||
                  assetImportPreview.validCount === 0
                }
              >
                {assetImporting ? "Importing..." : "Confirm Import"}
              </Button>
            </div>

            {assetImportFile && (
              <p className="text-xs text-muted-foreground">
                Selected file: {assetImportFile.name}
              </p>
            )}

            {assetImportError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {assetImportError}
              </div>
            )}

            {assetImportPreview && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Rows: {assetImportPreview.totalRows}</Badge>
                  <Badge variant="secondary">Valid: {assetImportPreview.validCount}</Badge>
                  <Badge variant={assetImportPreview.invalidCount > 0 ? "destructive" : "secondary"}>
                    Invalid: {assetImportPreview.invalidCount}
                  </Badge>
                </div>

                {assetImportPreview.errors.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="mb-2 text-sm font-medium text-destructive">Validation Errors</p>
                    <ScrollArea className="h-28 pr-2">
                      <div className="space-y-1 text-xs text-destructive">
                        {assetImportPreview.errors.map((item) => (
                          <p key={`${item.row}-${item.message}`}>
                            Row {item.row}: {item.message}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <TablePreview rows={assetImportPreview.previewRows} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={staffImportOpen} onOpenChange={setStaffImportOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Staff Master Data</DialogTitle>
            <DialogDescription>Upload CSV/Excel with required staff fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={downloadStaffTemplate}>
                Download Template
              </Button>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleStaffFileSelect(file);
                }}
              />
              <Button type="button" onClick={() => void previewStaffImport()} disabled={staffImportLoading || !staffImportFile}>
                {staffImportLoading ? "Previewing..." : "Preview"}
              </Button>
              <Button
                type="button"
                onClick={() => void confirmStaffImport()}
                disabled={
                  staffImporting ||
                  !staffImportPreview ||
                  staffImportPreview.summary.invalidRows > 0 ||
                  staffImportPreview.summary.validRows === 0
                }
              >
                {staffImporting ? "Importing..." : "Confirm Import"}
              </Button>
            </div>

            {staffImportFile && (
              <p className="text-xs text-muted-foreground">
                Selected file: {staffImportFile.name}
              </p>
            )}

            {staffImportError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {staffImportError}
              </div>
            )}

            {staffImportPreview && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Rows: {staffImportPreview.summary.totalRows}</Badge>
                  <Badge variant="secondary">Valid: {staffImportPreview.summary.validRows}</Badge>
                  <Badge variant={staffImportPreview.summary.invalidRows > 0 ? "destructive" : "secondary"}>
                    Invalid: {staffImportPreview.summary.invalidRows}
                  </Badge>
                </div>

                {staffImportPreview.errors.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="mb-2 text-sm font-medium text-destructive">Validation Errors</p>
                    <ScrollArea className="h-28 pr-2">
                      <div className="space-y-1 text-xs text-destructive">
                        {staffImportPreview.errors.map((item) => (
                          <p key={`${item.row}-${item.message}`}>
                            Row {item.row}: {item.message}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <TablePreview rows={staffImportPreview.rows} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportPanel({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/80 transition-all duration-300 hover:shadow-card-hover">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div>{actions}</div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ReportActions({
  busyKey,
  reportKey,
  onView,
  onExcel,
  onPdf,
}: {
  busyKey: string | null;
  reportKey: string;
  onView: () => void;
  onExcel: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="transition-all duration-300"
        disabled={busyKey === `${reportKey}:preview`}
        onClick={onView}
      >
        View
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1 transition-all duration-300"
        disabled={busyKey === `${reportKey}:xlsx`}
        onClick={onExcel}
      >
        <Download className="h-3 w-3" />
        {busyKey === `${reportKey}:xlsx` ? "..." : "Excel"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1 transition-all duration-300"
        disabled={busyKey === `${reportKey}:pdf`}
        onClick={onPdf}
      >
        <Download className="h-3 w-3" />
        {busyKey === `${reportKey}:pdf` ? "..." : "PDF"}
      </Button>
    </div>
  );
}

function TablePreview({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) {
    return <div className="rounded-md border p-8 text-center text-muted-foreground">No rows found.</div>;
  }

  const columns = Object.keys(rows[0]);
  return (
    <ScrollArea className="max-h-[65vh] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={`${idx}-${String(row[columns[0]] ?? idx)}`}>
              {columns.map((column) => (
                <TableCell key={`${idx}-${column}`} className="align-top text-xs">
                  {formatCell(row[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function IssueSummaryPreview({ summary }: { summary: IssueSummaryResponse | null }) {
  if (!summary) {
    return <div className="rounded-md border p-8 text-center text-muted-foreground">No summary data.</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SimpleListCard
        title="By Category"
        items={summary.categoryCounts.map((item) => `${item.category}: ${item.count}`)}
      />
      <SimpleListCard
        title="By Status"
        items={summary.statusCounts.map((item) => `${item.status}: ${item.count}`)}
      />
      <SimpleListCard
        title="By Asset Type"
        items={summary.assetTypeCounts.map((item) => `${item.assetType}: ${item.count}`)}
      />
      <SimpleListCard
        title="Top Problematic Assets"
        items={summary.problematicAssets.map(
          (item) =>
            `${item.assetTag} (${item.assetType}) IMEI:${item.imeiNo} ${item.brand} ${item.model} - ${item.issuesCount}`
        )}
      />
    </div>
  );
}

function SimpleListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border p-4">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ScrollArea className="h-44 pr-2">
        <div className="space-y-1 text-xs text-muted-foreground">
          {items.length === 0 ? (
            <p>No data</p>
          ) : (
            items.map((item) => <p key={item}>{item}</p>)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Invalid file encoding"));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
