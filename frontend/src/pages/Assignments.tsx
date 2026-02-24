import { ReactNode, useEffect, useMemo, useState } from "react";
import { Calendar, Eye, MoreHorizontal, Plus, Search, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { assignmentsApi } from "@/lib/assignmentsApi";
import { ApproveReturnModal } from "@/components/assignments/ApproveReturnModal";
import { RejectReturnModal } from "@/components/assignments/RejectReturnModal";
import { NewAssignmentModal } from "@/components/assignments/NewAssignmentModal";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AssignmentStatus =
  | "PENDING_ACCEPTANCE"
  | "ACTIVE"
  | "REFUSED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "CANCELLED"
  | "REVERTED";
type NextLaptopStatus = "IN_STOCK" | "IN_REPAIR";

interface AssetOption {
  id: number;
  assetType: string;
  assetTag?: string;
  serialNumber: string;
  brand: string;
  model: string;
  status: string;
  location?: string | null;
  department?: string | null;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
}

interface Accessory {
  id: string;
  name: string;
  type?: string;
  status?: string;
}

interface Assignment {
  id: string;
  assetId: number;
  groupId?: string;
  laptopId?: string;
  targetType?: "STAFF" | "LOCATION" | "DEPARTMENT";
  location?: string;
  department?: string;
  staffId?: string;
  status: AssignmentStatus;
  assignedDate: string;
  refusedReason?: string;
  returnRejectedReason?: string;
  revertedAt?: string;
  revertReason?: string;
  accessoriesIssuedJson?: string;
  notes?: string;
  bundleAssets?: Array<{
    assignmentId: string;
    assetId: number;
    assetType?: string;
    assetTag?: string;
    serialNumber?: string;
    brand?: string;
    model?: string;
    status?: string;
  }>;
  asset?: AssetOption;
  laptop?: {
    id: string;
    assetTag?: string;
    serialNumber: string;
    brand: string;
    model: string;
    status: string;
  };
  staff: Staff;
}

export default function Assignments() {
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [accessoriesLoading, setAccessoriesLoading] = useState(false);
  const [accessoriesError, setAccessoriesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Assignment | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [revertReason, setRevertReason] = useState("");

  const [approveForm, setApproveForm] = useState({
    condition: "",
    accessories: "",
    note: "",
    nextLaptopStatus: "IN_STOCK" as NextLaptopStatus,
  });

  const loadAccessories = async () => {
    setAccessoriesLoading(true);
    setAccessoriesError(null);
    try {
      const response = await apiClient.get<Accessory[]>("/accessories");
      setAccessories(Array.isArray((response as any).data) ? (response as any).data : []);
    } catch (e) {
      const status = e instanceof APIClientError ? e.status : Number((e as any)?.status || 0);
      if (status === 404) {
        setAccessories([]);
        setAccessoriesError(null);
        return;
      }
      const message = e instanceof Error ? e.message : "Failed to load accessories";
      setAccessoriesError(message);
      toast({
        title: "Accessories Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAccessoriesLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("search", search.trim());
      const response = await apiClient.get<Assignment[]>(`/assignments?${params.toString()}`);
      setAssignments(Array.isArray((response as any).data) ? (response as any).data : []);
      setTotal(Number((response as any).total || 0));
      setTotalPages(Number((response as any).totalPages || 1));
      setPage(Number((response as any).page || page));
    } catch (e) {
      setError(
        e instanceof APIClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load assignments"
      );
      setAssignments([]);
      setAccessories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    void loadAccessories();
  }, [page, pageSize, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredAssignments = useMemo(() => assignments, [assignments]);

  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    for (const item of assignments) {
      if (item.location?.trim()) set.add(item.location.trim());
      if (item.asset?.location?.trim()) set.add(item.asset.location.trim());
    }
    return Array.from(set);
  }, [assignments]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const item of assignments) {
      if (item.department?.trim()) set.add(item.department.trim());
      if (item.staff?.department?.trim()) set.add(item.staff.department.trim());
      if (item.asset?.department?.trim()) set.add(item.asset.department.trim());
    }
    return Array.from(set);
  }, [assignments]);

  const returnRequestedQueue = filteredAssignments.filter((item) => item.status === "RETURN_REQUESTED");

  const handlePost = async (
    key: string,
    endpoint: string,
    body: unknown,
    successTitle: string,
    successDescription: string,
    onSuccessClose?: () => void
  ) => {
    setBusy(key);
    try {
      await apiClient.post(endpoint, body);
      toast({ title: successTitle, description: successDescription });
      onSuccessClose?.();
      setSelected(null);
      await loadData();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleRevertAssignment = async () => {
    if (!selected) return;

    setBusy(selected.id);
    try {
      const response = await assignmentsApi.revertAssignment<Assignment>(selected.id, {
        reason: revertReason.trim() || undefined,
      });
      toast({
        title: "Assignment reverted",
        description: (response as any)?.message || "Asset returned to inventory.",
      });
      setRevertOpen(false);
      setRevertReason("");
      setSelected(null);
      await loadData();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to revert assignment",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="rounded-xl border bg-card p-10 text-center">Loading assignments...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="text-destructive">{error}</p>
        <Button className="mt-3" onClick={() => void loadData()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-muted-foreground">Manage asset issuance and return workflows.</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Assignment
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by asset/staff"
        />
      </div>

      {returnRequestedQueue.length > 0 && (
        <Section title="Return Requests Queue">
          {returnRequestedQueue.map((assignment) => (
            <AssignmentCard
              key={`queue-${assignment.id}`}
              assignment={assignment}
              busy={busy === assignment.id}
              onApproveReturn={() => {
                setSelected(assignment);
                setApproveForm({
                  condition: "",
                  accessories: "",
                  note: "",
                  nextLaptopStatus: "IN_STOCK",
                });
                setApproveOpen(true);
              }}
              onRejectReturn={() => {
                setSelected(assignment);
                setRejectReason("");
                setRejectOpen(true);
              }}
              onCancelPending={() => undefined}
              onViewDetails={() => {
                toast({
                  title: "Assignment Details",
                  description: `Asset ${assignment.asset?.assetTag || assignment.asset?.serialNumber || assignment.id} | ${getStatusLabel(assignment.status)}`,
                });
              }}
              onRevert={() => {
                setSelected(assignment);
                setRevertReason("");
                setRevertOpen(true);
              }}
            />
          ))}
        </Section>
      )}

      <Section title="All Assignments">
        {filteredAssignments.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">No assignments found.</div>
        ) : (
          filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              busy={busy === assignment.id}
              onApproveReturn={() => {
                setSelected(assignment);
                setApproveForm({
                  condition: "",
                  accessories: "",
                  note: "",
                  nextLaptopStatus: "IN_STOCK",
                });
                setApproveOpen(true);
              }}
              onRejectReturn={() => {
                setSelected(assignment);
                setRejectReason("");
                setRejectOpen(true);
              }}
              onCancelPending={() =>
                void handlePost(
                  assignment.id,
                  `/assignments/${assignment.id}/cancel`,
                  {},
                  "Cancelled",
                  "Pending assignment cancelled."
                )
              }
              onViewDetails={() => {
                toast({
                  title: "Assignment Details",
                  description: `Asset ${assignment.asset?.assetTag || assignment.asset?.serialNumber || assignment.id} | ${getStatusLabel(assignment.status)}`,
                });
              }}
              onRevert={() => {
                setSelected(assignment);
                setRevertReason("");
                setRevertOpen(true);
              }}
            />
          ))
        )}
      </Section>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {assignments.length} of {total} assignments
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

      <NewAssignmentModal
        open={newOpen}
        busy={busy === "create"}
        locations={availableLocations}
        departments={availableDepartments}
        accessories={accessories}
        accessoriesLoading={accessoriesLoading}
        accessoriesError={accessoriesError}
        onOpenChange={setNewOpen}
        onRefreshAccessories={() => void loadAccessories()}
        onSubmit={(payload) =>
          void handlePost(
            "create",
            "/assignments",
            payload,
            "Created",
            "Assignment has been created.",
            () => setNewOpen(false)
          )
        }
      />

      <ApproveReturnModal
        open={approveOpen}
        condition={approveForm.condition}
        accessories={approveForm.accessories}
        note={approveForm.note}
        nextLaptopStatus={approveForm.nextLaptopStatus}
        submitting={busy === selected?.id}
        onConditionChange={(condition) => setApproveForm((current) => ({ ...current, condition }))}
        onAccessoriesChange={(accessories) =>
          setApproveForm((current) => ({ ...current, accessories }))
        }
        onNoteChange={(note) => setApproveForm((current) => ({ ...current, note }))}
        onNextLaptopStatusChange={(nextLaptopStatus) =>
          setApproveForm((current) => ({ ...current, nextLaptopStatus }))
        }
        onSubmit={() =>
          selected &&
          void handlePost(
            selected.id,
            `/assignments/${selected.id}/admin-approve-return`,
            {
              finalReturnCondition: { summary: approveForm.condition },
              finalAccessoriesReturned: parseCsv(approveForm.accessories),
              decisionNote: approveForm.note || undefined,
              nextLaptopStatus: approveForm.nextLaptopStatus,
            },
            "Approved",
            "Return approved and inventory updated.",
            () => setApproveOpen(false)
          )
        }
        onOpenChange={setApproveOpen}
      />

      <RejectReturnModal
        open={rejectOpen}
        reason={rejectReason}
        submitting={busy === selected?.id}
        onReasonChange={setRejectReason}
        onSubmit={() =>
          selected &&
          void handlePost(
            selected.id,
            `/assignments/${selected.id}/admin-reject-return`,
            { reason: rejectReason.trim() },
            "Rejected",
            "Return request rejected. Assignment remains with current target.",
            () => setRejectOpen(false)
          )
        }
        onOpenChange={setRejectOpen}
      />

      <AlertDialog
        open={revertOpen}
        onOpenChange={(open) => {
          setRevertOpen(open);
          if (!open) {
            setRevertReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unassign the asset immediately and return it to inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="revert-reason" className="text-sm font-medium">
              Reason (optional)
            </label>
            <Textarea
              id="revert-reason"
              rows={3}
              value={revertReason}
              onChange={(event) => setRevertReason(event.target.value)}
              placeholder="Add an optional reason for audit trail"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === selected?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleRevertAssignment();
              }}
              disabled={busy === selected?.id}
            >
              {busy === selected?.id ? "Reverting..." : "Revert Assignment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getStatusLabel(status: AssignmentStatus): string {
  if (status === "PENDING_ACCEPTANCE") return "Pending Acceptance";
  if (status === "ACTIVE") return "Active";
  if (status === "REFUSED") return "Refused";
  if (status === "RETURN_REQUESTED") return "Return Requested";
  if (status === "RETURN_APPROVED") return "Returned";
  if (status === "RETURN_REJECTED") return "Return Rejected";
  if (status === "REVERTED") return "Reverted";
  return "Cancelled";
}

function getStatusVariant(status: AssignmentStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "REFUSED" || status === "RETURN_REJECTED") return "destructive";
  if (status === "PENDING_ACCEPTANCE" || status === "RETURN_REQUESTED") return "outline";
  return "secondary";
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function AssignmentCard({
  assignment,
  busy,
  onApproveReturn,
  onRejectReturn,
  onCancelPending,
  onViewDetails,
  onRevert,
}: {
  assignment: Assignment;
  busy: boolean;
  onApproveReturn: () => void;
  onRejectReturn: () => void;
  onCancelPending: () => void;
  onViewDetails: () => void;
  onRevert: () => void;
}) {
  const issuedAccessories = parseAccessories(assignment.accessoriesIssuedJson);
  const bundleAssets = assignment.bundleAssets || [];
  const asset = assignment.asset || assignment.laptop;
  const assetType = assignment.asset?.assetType || "LAPTOP";
  const targetType = assignment.targetType || "STAFF";

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {asset?.brand} {asset?.model} to {assignment.staff?.name || "Target"}
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{assetType}</Badge>
            <span>{asset?.assetTag || asset?.serialNumber}</span>
            <span>|</span>
            <span>
              {targetType === "STAFF"
                ? assignment.staff?.name || "Staff"
                : targetType === "LOCATION"
                  ? `Location: ${assignment.location || "-"}`
                  : `Department: ${assignment.department || "-"}`}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Issued {new Date(assignment.assignedDate).toLocaleDateString()}
          </p>
          {issuedAccessories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {issuedAccessories.map((item) => (
                <Badge key={item} variant="secondary">{item}</Badge>
              ))}
            </div>
          )}
          {bundleAssets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {bundleAssets.map((item) => (
                <Badge key={item.assignmentId} variant="secondary">
                  {item.assetType}: {item.assetTag || item.serialNumber}
                </Badge>
              ))}
            </div>
          )}
          {assignment.status === "REFUSED" && assignment.refusedReason && (
            <p className="mt-1 text-sm text-destructive">{assignment.refusedReason}</p>
          )}
          {assignment.status === "RETURN_REJECTED" && assignment.returnRejectedReason && (
            <p className="mt-1 text-sm text-destructive">{assignment.returnRejectedReason}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(assignment.status)}>{getStatusLabel(assignment.status)}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" disabled={busy}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem className="gap-2" onClick={onViewDetails}>
                <Eye className="h-4 w-4" />
                View details
              </DropdownMenuItem>
              {assignment.status !== "REVERTED" && (
                <DropdownMenuItem className="gap-2 text-destructive" onClick={onRevert}>
                  <Undo2 className="h-4 w-4" />
                  Revert assignment
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {assignment.status === "RETURN_REQUESTED" && (
          <>
            <Button size="sm" onClick={onApproveReturn} disabled={busy}>
              Approve Return
            </Button>
            <Button size="sm" variant="destructive" onClick={onRejectReturn} disabled={busy}>
              Reject Return
            </Button>
          </>
        )}

        {assignment.status === "PENDING_ACCEPTANCE" && (
          <Button size="sm" variant="outline" onClick={onCancelPending} disabled={busy}>
            Cancel Pending
          </Button>
        )}

        {assignment.status === "REVERTED" && (
          <p className="text-sm text-muted-foreground">
            Assignment reverted{assignment.revertReason ? `: ${assignment.revertReason}` : "."}
          </p>
        )}
      </div>
    </div>
  );
}

function parseAccessories(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}
