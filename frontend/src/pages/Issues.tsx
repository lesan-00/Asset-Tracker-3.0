import { useEffect, useMemo, useState } from "react";
import { Plus, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";
type IssuePriority = "low" | "medium" | "high" | "critical";

interface IssueRecord {
  id: string;
  laptopId: string;
  title: string;
  description: string;
  category: string;
  status: IssueStatus;
  priority: IssuePriority;
  reportedByUserId: string;
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  laptop?: {
    assetTag?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
  };
  reporter?: {
    id: string;
    fullName?: string;
    email?: string;
  };
}

interface LaptopRecord {
  id: string;
  assetTag: string;
  brand: string;
  model: string;
}

const priorityStyles: Record<IssuePriority, string> = {
  critical: "status-lost",
  high: "status-repair",
  medium: "status-assigned",
  low: "status-available",
};

const statusStyles: Record<IssueStatus, string> = {
  open: "bg-destructive/10 text-destructive border-destructive/30",
  in_progress: "bg-status-repair/10 text-status-repair border-status-repair/30",
  resolved: "bg-status-available/10 text-status-available border-status-available/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const emptyCreateForm = {
  title: "",
  category: "",
  priority: "medium" as IssuePriority,
  description: "",
  laptopId: "",
};

export default function Issues() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { toast } = useToast();

  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [laptops, setLaptops] = useState<LaptopRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [reportOpen, setReportOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [adminStatus, setAdminStatus] = useState<IssueStatus>("open");
  const [adminAssignedTo, setAdminAssignedTo] = useState("");
  const [adminResolutionNotes, setAdminResolutionNotes] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const extractList = <T,>(response: unknown): T[] => {
    if (Array.isArray(response)) return response as T[];
    if (
      typeof response === "object" &&
      response !== null &&
      "data" in response &&
      Array.isArray((response as { data?: unknown }).data)
    ) {
      return (response as { data: T[] }).data;
    }
    return [];
  };

  const extractSingle = <T,>(response: unknown): T | null => {
    if (response && typeof response === "object" && "data" in (response as object)) {
      const value = (response as { data?: unknown }).data;
      return (value ?? null) as T | null;
    }
    return (response ?? null) as T | null;
  };

  const fetchLaptops = async () => {
    const response = await apiClient.get<LaptopRecord[]>("/laptops");
    setLaptops(extractList<LaptopRecord>(response));
  };

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    const endpoint = params.toString() ? `/issues?${params.toString()}` : "/issues";

    try {
      const response = await apiClient.get<IssueRecord[]>(endpoint);
      setIssues(extractList<IssueRecord>(response));
    } catch (err) {
      if (err instanceof APIClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load issues");
      }
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaptops().catch(() => {
      // Keep page usable even if laptop list fails.
    });
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [search, statusFilter, priorityFilter]);

  const openCount = useMemo(
    () => issues.filter((i) => i.status === "open" || i.status === "in_progress").length,
    [issues]
  );
  const resolvedCount = useMemo(
    () => issues.filter((i) => i.status === "resolved" || i.status === "closed").length,
    [issues]
  );

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.category || !createForm.description || !createForm.laptopId) {
      toast({
        title: "Error",
        description: "Title, category, laptop, and description are required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      await apiClient.post("/issues", {
        title: createForm.title,
        category: createForm.category,
        description: createForm.description,
        laptopId: createForm.laptopId,
        priority: createForm.priority,
      });
      toast({
        title: "Success",
        description: "Issue reported successfully",
      });
      setCreateForm(emptyCreateForm);
      setReportOpen(false);
      await fetchIssues();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to report issue",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetails = async (issueId: string) => {
    setSelectedIssueId(issueId);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const response = await apiClient.get<IssueRecord>(`/issues/${issueId}`);
      const issue = extractSingle<IssueRecord>(response);
      if (!issue) throw new Error("Issue details not found");
      setSelectedIssue(issue);
      setAdminStatus(issue.status);
      setAdminAssignedTo(issue.assignedTo || "");
      setAdminResolutionNotes(issue.resolutionNotes || "");
    } catch (err) {
      setSelectedIssue(null);
      setDetailsError(err instanceof Error ? err.message : "Failed to load issue details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAdminUpdate = async () => {
    if (!isAdmin || !selectedIssueId) return;
    setUpdating(true);
    try {
      await apiClient.patch(`/issues/${selectedIssueId}`, {
        status: adminStatus,
        assignedTo: adminAssignedTo || undefined,
        resolutionNotes: adminResolutionNotes || undefined,
      });

      toast({
        title: "Success",
        description: "Issue updated successfully",
      });

      await Promise.all([fetchIssues(), handleViewDetails(selectedIssueId)]);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update issue",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Issue Tracking</h1>
          <p className="text-muted-foreground">Manage laptop issues, repairs, and incidents</p>
        </div>
        <Button className="gap-2" onClick={() => setReportOpen(true)}>
          <Plus className="w-4 h-4" />
          Report Issue
        </Button>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <span className="font-semibold">{openCount}</span>
          <span className="text-muted-foreground">Open Issues</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-status-available" />
          <span className="font-semibold">{resolvedCount}</span>
          <span className="text-muted-foreground">Resolved</span>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search issues..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">Loading issues...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-destructive font-medium">Failed to load issues</p>
          <p className="text-muted-foreground mt-1">{error}</p>
          <Button className="mt-4" onClick={fetchIssues}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-xl border bg-card p-6 card-hover animate-fade-in">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline" className={cn("font-medium border", priorityStyles[issue.priority])}>
                      {issue.priority}
                    </Badge>
                    <Badge variant="outline" className={cn("font-medium border", statusStyles[issue.status])}>
                      {issue.status.replace("_", " ")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{issue.category}</span>
                  </div>

                  <h3 className="font-semibold text-lg mb-1">{issue.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">{issue.laptop?.assetTag || "N/A"}</span>
                      {" "}• {issue.laptop?.brand || "Unknown"} {issue.laptop?.model || ""}
                    </span>
                    <span>Created: {new Date(issue.createdAt).toLocaleDateString()}</span>
                    {issue.assignedTo && <span>Assigned to: {issue.assignedTo}</span>}
                  </div>

                  {issue.resolutionNotes && (
                    <div className="mt-4 p-4 bg-status-available/5 rounded-lg border border-status-available/20">
                      <p className="text-sm font-medium text-status-available mb-1">Resolution</p>
                      <p className="text-sm">{issue.resolutionNotes}</p>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(issue.id)}>
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && issues.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No issues found matching your criteria.</p>
        </div>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Report Issue</DialogTitle>
            <DialogDescription>Create a new issue ticket.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateIssue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issue-title">Title *</Label>
              <Input
                id="issue-title"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                disabled={creating}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Input
                  value={createForm.category}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select
                  value={createForm.priority}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, priority: value as IssuePriority }))}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Laptop *</Label>
              <Select
                value={createForm.laptopId}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, laptopId: value }))}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Select laptop" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {laptops.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.assetTag} - {l.brand} {l.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-description">Description *</Label>
              <Textarea
                id="issue-description"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={5}
                disabled={creating}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Submitting..." : "Submit Issue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedIssueId(null);
            setSelectedIssue(null);
            setDetailsError(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
            <DialogDescription>View full issue information and updates.</DialogDescription>
          </DialogHeader>

          {detailsLoading && <p className="text-muted-foreground">Loading issue details...</p>}
          {!detailsLoading && detailsError && <p className="text-destructive">{detailsError}</p>}

          {!detailsLoading && !detailsError && selectedIssue && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={cn("font-medium border", priorityStyles[selectedIssue.priority])}>
                  {selectedIssue.priority}
                </Badge>
                <Badge variant="outline" className={cn("font-medium border", statusStyles[selectedIssue.status])}>
                  {selectedIssue.status.replace("_", " ")}
                </Badge>
                <span className="text-sm text-muted-foreground">{selectedIssue.category}</span>
              </div>

              <div>
                <p className="font-semibold text-lg">{selectedIssue.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedIssue.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p>
                  <span className="font-medium">Laptop:</span>{" "}
                  {selectedIssue.laptop?.assetTag || "N/A"} {selectedIssue.laptop?.brand || ""}{" "}
                  {selectedIssue.laptop?.model || ""}
                </p>
                <p>
                  <span className="font-medium">Reporter:</span>{" "}
                  {selectedIssue.reporter?.fullName || selectedIssue.reporter?.email || "Unknown"}
                </p>
                <p>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(selectedIssue.createdAt).toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Last Updated:</span>{" "}
                  {new Date(selectedIssue.updatedAt).toLocaleString()}
                </p>
                {selectedIssue.assignedTo && (
                  <p>
                    <span className="font-medium">Assigned To:</span> {selectedIssue.assignedTo}
                  </p>
                )}
              </div>

              {selectedIssue.resolutionNotes && (
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-sm mb-1">Resolution Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedIssue.resolutionNotes}</p>
                </div>
              )}

              {isAdmin && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-medium">Admin Actions</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={adminStatus} onValueChange={(value) => setAdminStatus(value as IssueStatus)}>
                        <SelectTrigger className="bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assigned-to">Assign To</Label>
                      <Input
                        id="assigned-to"
                        value={adminAssignedTo}
                        onChange={(e) => setAdminAssignedTo(e.target.value)}
                        placeholder="Technician or team"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resolution-notes">Resolution Notes</Label>
                    <Textarea
                      id="resolution-notes"
                      rows={4}
                      value={adminResolutionNotes}
                      onChange={(e) => setAdminResolutionNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleAdminUpdate} disabled={updating}>
                      {updating ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
