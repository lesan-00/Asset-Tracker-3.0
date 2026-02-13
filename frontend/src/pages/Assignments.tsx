import { ReactNode, useEffect, useMemo, useState } from "react";
import { Calendar, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { TermsModal } from "@/components/assignments/TermsModal";
import { RefuseModal } from "@/components/assignments/RefuseModal";
import { ReturnRequestModal } from "@/components/assignments/ReturnRequestModal";
import { ApproveReturnModal } from "@/components/assignments/ApproveReturnModal";
import { RejectReturnModal } from "@/components/assignments/RejectReturnModal";
import { NewAssignmentModal } from "@/components/assignments/NewAssignmentModal";

type AssignmentStatus =
  | "PENDING_ACCEPTANCE"
  | "ACTIVE"
  | "REFUSED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "CANCELLED";
type NextLaptopStatus = "AVAILABLE" | "UNDER_REPAIR";

interface Laptop {
  id: string;
  assetTag?: string;
  serialNumber: string;
  brand: string;
  model: string;
  status: string;
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
  laptopId: string;
  staffId: string;
  status: AssignmentStatus;
  assignedDate: string;
  refusedReason?: string;
  returnRejectedReason?: string;
  accessoriesIssuedJson?: string;
  notes?: string;
  laptop: Laptop;
  staff: Staff;
}

const TERMS_VERSION = "v1";
const TERMS = [
  "I am responsible for the replaceable value of the said equipment and accessories in the event of loss or damage due to negligence.",
  "I will return the laptop and all issued accessories immediately when requested by the organization.",
  "I will not transfer the laptop to another user without IT/admin authorization.",
  "I will report faults, loss, or theft immediately to IT/admin.",
  "I will keep the device secure and comply with organization security policies.",
] as const;

export default function Assignments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [accessoriesLoading, setAccessoriesLoading] = useState(false);
  const [accessoriesError, setAccessoriesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Assignment | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState<boolean[]>(TERMS.map(() => false));
  const [refuseReason, setRefuseReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [requestForm, setRequestForm] = useState({
    condition: "",
    accessories: "",
  });

  const [approveForm, setApproveForm] = useState({
    condition: "",
    accessories: "",
    note: "",
    nextLaptopStatus: "AVAILABLE" as NextLaptopStatus,
  });

  const loadAccessories = async () => {
    setAccessoriesLoading(true);
    setAccessoriesError(null);
    try {
      const response = await apiClient.get<Accessory[]>("/accessories");
      setAccessories(Array.isArray((response as any).data) ? (response as any).data : []);
    } catch (e) {
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
      const requests = isAdmin
        ? [
            apiClient.get<Assignment[]>("/assignments"),
            apiClient.get<Laptop[]>("/laptops"),
            apiClient.get<Staff[]>("/staff"),
          ]
        : [
            apiClient.get<Assignment[]>("/assignments"),
            apiClient.get<Laptop[]>("/laptops"),
          ];

      const responses = await Promise.all(requests);
      console.log("[Assignments] /assignments response:", responses[0]);
      setAssignments(Array.isArray((responses[0] as any).data) ? (responses[0] as any).data : []);
      setLaptops(Array.isArray((responses[1] as any).data) ? (responses[1] as any).data : []);

      if (isAdmin) {
        setStaff(Array.isArray((responses[2] as any).data) ? (responses[2] as any).data : []);
      } else {
        setStaff([]);
      }
    } catch (e) {
      setError(
        e instanceof APIClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load assignments"
      );
      setAssignments([]);
      setLaptops([]);
      setStaff([]);
      setAccessories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadAccessories();
  }, [isAdmin]);

  const filteredAssignments = useMemo(() => {
    const term = search.toLowerCase();
    return assignments.filter((assignment) =>
      `${assignment.laptop?.assetTag || ""} ${assignment.laptop?.brand || ""} ${assignment.laptop?.model || ""} ${assignment.staff?.name || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [assignments, search]);

  const pendingAssignments = filteredAssignments.filter((item) => item.status === "PENDING_ACCEPTANCE");
  const returnRequestedQueue = filteredAssignments.filter((item) => item.status === "RETURN_REQUESTED");
  const availableLaptops = laptops.filter((item) => item.status === "AVAILABLE");
  const canAccept = acceptedTerms.every(Boolean);

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
          <p className="text-muted-foreground">Issue, acceptance, and return approvals</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Assignment
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by laptop/staff"
        />
      </div>

      {!isAdmin && pendingAssignments.length > 0 && (
        <Section title="Pending Assignments">
          {pendingAssignments.map((assignment) => (
            <AssignmentCard
              key={`pending-${assignment.id}`}
              assignment={assignment}
              isAdmin={isAdmin}
              busy={busy === assignment.id}
              onAccept={() => {
                setSelected(assignment);
                setAcceptedTerms(TERMS.map(() => false));
                setAcceptOpen(true);
              }}
              onRefuse={() => {
                setSelected(assignment);
                setRefuseReason("");
                setRefuseOpen(true);
              }}
              onRequestReturn={() => {
                setSelected(assignment);
                setRequestForm({ condition: "", accessories: "" });
                setRequestOpen(true);
              }}
              onApproveReturn={() => undefined}
              onRejectReturn={() => undefined}
              onCancelPending={() => undefined}
            />
          ))}
        </Section>
      )}

      {isAdmin && returnRequestedQueue.length > 0 && (
        <Section title="Return Requests Queue">
          {returnRequestedQueue.map((assignment) => (
            <AssignmentCard
              key={`queue-${assignment.id}`}
              assignment={assignment}
              isAdmin={isAdmin}
              busy={busy === assignment.id}
              onAccept={() => undefined}
              onRefuse={() => undefined}
              onRequestReturn={() => undefined}
              onApproveReturn={() => {
                setSelected(assignment);
                setApproveForm({
                  condition: "",
                  accessories: "",
                  note: "",
                  nextLaptopStatus: "AVAILABLE",
                });
                setApproveOpen(true);
              }}
              onRejectReturn={() => {
                setSelected(assignment);
                setRejectReason("");
                setRejectOpen(true);
              }}
              onCancelPending={() => undefined}
            />
          ))}
        </Section>
      )}

      <Section title={isAdmin ? "All Assignments" : "My Assignments"}>
        {filteredAssignments.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">No assignments found.</div>
        ) : (
          filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              isAdmin={isAdmin}
              busy={busy === assignment.id}
              onAccept={() => {
                setSelected(assignment);
                setAcceptedTerms(TERMS.map(() => false));
                setAcceptOpen(true);
              }}
              onRefuse={() => {
                setSelected(assignment);
                setRefuseReason("");
                setRefuseOpen(true);
              }}
              onRequestReturn={() => {
                setSelected(assignment);
                setRequestForm({ condition: "", accessories: "" });
                setRequestOpen(true);
              }}
              onApproveReturn={() => {
                setSelected(assignment);
                setApproveForm({
                  condition: "",
                  accessories: "",
                  note: "",
                  nextLaptopStatus: "AVAILABLE",
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
            />
          ))
        )}
      </Section>

      <NewAssignmentModal
        open={newOpen}
        busy={busy === "create"}
        laptops={availableLaptops}
        staff={staff}
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
            "Assignment is pending acceptance.",
            () => setNewOpen(false)
          )
        }
      />

      <TermsModal
        open={acceptOpen}
        terms={Array.from(TERMS)}
        checked={acceptedTerms}
        onCheckedChange={(index, value) =>
          setAcceptedTerms((current) =>
            current.map((item, itemIndex) => (itemIndex === index ? value : item))
          )
        }
        canAccept={Boolean(selected) && canAccept}
        submitting={busy === selected?.id}
        onAccept={() =>
          selected &&
          void handlePost(
            selected.id,
            `/assignments/${selected.id}/accept`,
            {
              termsAccepted: true,
              termsVersion: TERMS_VERSION,
              acceptedTerms,
            },
            "Accepted",
            "Assignment is now active.",
            () => setAcceptOpen(false)
          )
        }
        onOpenChange={setAcceptOpen}
      />

      <RefuseModal
        open={refuseOpen}
        reason={refuseReason}
        submitting={busy === selected?.id}
        onReasonChange={setRefuseReason}
        onSubmit={() =>
          selected &&
          void handlePost(
            selected.id,
            `/assignments/${selected.id}/refuse`,
            { reason: refuseReason || undefined },
            "Refused",
            "Assignment has been refused.",
            () => setRefuseOpen(false)
          )
        }
        onOpenChange={setRefuseOpen}
      />

      <ReturnRequestModal
        open={requestOpen}
        condition={requestForm.condition}
        accessories={requestForm.accessories}
        submitting={busy === selected?.id}
        onConditionChange={(condition) => setRequestForm((current) => ({ ...current, condition }))}
        onAccessoriesChange={(accessories) =>
          setRequestForm((current) => ({ ...current, accessories }))
        }
        onSubmit={() =>
          selected &&
          void handlePost(
            selected.id,
            `/assignments/${selected.id}/request-return`,
            {
              returnCondition: requestForm.condition ? { summary: requestForm.condition } : undefined,
              accessoriesReturned: parseCsv(requestForm.accessories),
            },
            "Requested",
            "Return request submitted.",
            () => setRequestOpen(false)
          )
        }
        onOpenChange={setRequestOpen}
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
            "Return request rejected. Assignment remains with staff.",
            () => setRejectOpen(false)
          )
        }
        onOpenChange={setRejectOpen}
      />
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
  isAdmin,
  busy,
  onAccept,
  onRefuse,
  onRequestReturn,
  onApproveReturn,
  onRejectReturn,
  onCancelPending,
}: {
  assignment: Assignment;
  isAdmin: boolean;
  busy: boolean;
  onAccept: () => void;
  onRefuse: () => void;
  onRequestReturn: () => void;
  onApproveReturn: () => void;
  onRejectReturn: () => void;
  onCancelPending: () => void;
}) {
  const issuedAccessories = parseAccessories(assignment.accessoriesIssuedJson);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {assignment.laptop?.brand} {assignment.laptop?.model} to {assignment.staff?.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {assignment.laptop?.assetTag || assignment.laptop?.serialNumber} | {assignment.staff?.department}
          </p>
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
          {assignment.status === "REFUSED" && assignment.refusedReason && (
            <p className="mt-1 text-sm text-destructive">{assignment.refusedReason}</p>
          )}
          {assignment.status === "RETURN_REJECTED" && assignment.returnRejectedReason && (
            <p className="mt-1 text-sm text-destructive">{assignment.returnRejectedReason}</p>
          )}
        </div>
        <Badge variant={getStatusVariant(assignment.status)}>{getStatusLabel(assignment.status)}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!isAdmin && assignment.status === "PENDING_ACCEPTANCE" && (
          <>
            <Button size="sm" onClick={onAccept} disabled={busy}>
              Review & Accept
            </Button>
            <Button size="sm" variant="destructive" onClick={onRefuse} disabled={busy}>
              Refuse
            </Button>
          </>
        )}

        {!isAdmin && (assignment.status === "ACTIVE" || assignment.status === "RETURN_REJECTED") && (
          <Button size="sm" variant="outline" onClick={onRequestReturn} disabled={busy}>
            Request Return
          </Button>
        )}

        {isAdmin && assignment.status === "RETURN_REQUESTED" && (
          <>
            <Button size="sm" onClick={onApproveReturn} disabled={busy}>
              Approve Return
            </Button>
            <Button size="sm" variant="destructive" onClick={onRejectReturn} disabled={busy}>
              Reject Return
            </Button>
          </>
        )}

        {isAdmin && assignment.status === "PENDING_ACCEPTANCE" && (
          <Button size="sm" variant="outline" onClick={onCancelPending} disabled={busy}>
            Cancel Pending
          </Button>
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
