import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, MoreHorizontal, Eye, Edit, Mail, Phone, Trash2 } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface StaffRecord {
  id: string;
  employeeName: string;
  epfNo?: string;
  epf_no?: string;
  name: string;
  email: string;
  department: string;
  location?: string;
  status?: "ACTIVE" | "DISABLED";
  phoneNumber?: string;
}

const defaultForm = {
  employeeName: "",
  epfNo: "",
  email: "",
  department: "",
  phoneNumber: "",
  status: "ACTIVE" as "ACTIVE" | "DISABLED",
};

const staffFormSchema = z.object({
  employeeName: z.string().trim().min(2, "Employee Name is required"),
  epfNo: z
    .string()
    .optional()
    .transform((value) => (value || "").trim().toUpperCase()),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  department: z.string().trim().optional(),
  phoneNumber: z.string().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

export default function Staff() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: defaultForm,
    mode: "onChange",
  });

  const canSave = submitting ? false : editingStaff ? isDirty && isValid : isValid;

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const staffResponse = await apiClient.get<StaffRecord[]>("/staff");

      const list = Array.isArray(staffResponse)
        ? staffResponse
        : Array.isArray((staffResponse as { data?: unknown }).data)
          ? ((staffResponse as { data: StaffRecord[] }).data)
          : [];
      setStaff(list);
    } catch (err) {
      if (err instanceof APIClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load staff");
      }
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const departments = Array.from(
    new Set(staff.map((item) => item.department).filter(Boolean))
  );

  const filteredStaff = staff.filter((item) => {
    const matchesSearch =
      (item.employeeName || item.name).toLowerCase().includes(search.toLowerCase()) ||
      (item.epfNo || "").toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()) ||
      item.department.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || item.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || statusFilter === "active";
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const handleOpenAddStaff = () => {
    if (import.meta.env.DEV) {
      console.log("[Staff] Add Staff button clicked");
    }
    setEditingStaff(null);
    reset(defaultForm);
    setAddStaffOpen(true);
  };

  const handleOpenEditStaff = (item: StaffRecord) => {
    setEditingStaff(item);
    reset({
      employeeName: item.employeeName || item.name,
      epfNo: item.epfNo || item.epf_no || "",
      email: item.email,
      department: item.department,
      phoneNumber: item.phoneNumber || "",
      status: item.status || "ACTIVE",
    });
    setAddStaffOpen(true);
  };

  const handleViewProfile = (staffId: string) => {
    if (import.meta.env.DEV) {
      console.log(`[Staff] View Profile clicked for ${staffId}`);
    }
    navigate(`/staff/${staffId}`);
  };

  const handleAddStaff = async (formData: StaffFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        employee_name: formData.employeeName.trim(),
        epf_no: formData.epfNo ? formData.epfNo.trim().toUpperCase() || null : null,
        email: formData.email?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        phone: formData.phoneNumber?.trim() || undefined,
        status: formData.status,
      };

      if (editingStaff) {
        await apiClient.put(`/staff/${editingStaff.id}`, payload);
      } else {
        await apiClient.post("/staff", payload);
      }

      toast({
        title: "Success",
        description: editingStaff
          ? "Staff member updated successfully"
          : "Staff member added successfully",
      });

      setAddStaffOpen(false);
      setEditingStaff(null);
      reset(defaultForm);
      await fetchStaff();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof APIClientError && err.status === 409
            ? "EPF No already exists"
            : err instanceof APIClientError && err.status === 403
              ? "Not authorized"
              : err instanceof Error
                ? err.message
                : "Failed to add staff",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (item: StaffRecord) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Delete staff member ${item.name}?`);
    if (!confirmed) return;

    try {
      await apiClient.delete(`/staff/${item.id}`);
      toast({
        title: "Deleted",
        description: "Staff member deleted successfully",
      });
      await fetchStaff();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete staff",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
            <p className="text-muted-foreground">
              Manage personnel records and assigned assets.
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">Loading staff...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
            <p className="text-muted-foreground">
              Manage personnel records and assigned assets.
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-destructive font-medium">Failed to load staff</p>
          <p className="text-muted-foreground mt-1">{error}</p>
          <Button className="mt-4" onClick={fetchStaff}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-lg font-semibold">Unauthorized</p>
        <p className="text-sm text-muted-foreground">Only administrators can manage staff profiles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground">
            Manage personnel records and assigned assets.
          </p>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={handleOpenAddStaff}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((item) => {
          const displayEpf = getDisplayEpf(item);
          return (
          <div key={item.id} className="rounded-xl border bg-card p-6 card-hover animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary-foreground">
                    {(item.employeeName || item.name)
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{item.employeeName || item.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    EPF: {displayEpf || "Not Set"}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() => handleViewProfile(item.id)}
                  >
                    <Eye className="w-4 h-4" /> View Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem className="gap-2" onClick={() => handleOpenEditStaff(item)}>
                      <Edit className="w-4 h-4" /> Edit
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem
                      className="gap-2 text-destructive"
                      onClick={() => handleDeleteStaff(item)}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 mb-4">
              <Badge variant={(item.status || "ACTIVE") === "ACTIVE" ? "default" : "secondary"}>
                {(item.status || "ACTIVE").toLowerCase()}
              </Badge>
              <p className="text-sm font-medium">{item.department}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{item.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{item.phoneNumber || "N/A"}</span>
              </div>
            </div>
          </div>
        )})}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No staff members found matching your criteria.</p>
        </div>
      )}

      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{editingStaff ? "Edit Staff Profile" : "Add Staff"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update staff profile details." : "Create a new staff profile."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAddStaff)} className="flex max-h-[85vh] flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <section className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium">Basic Info</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="staff-employee-name">Employee Name *</Label>
                    <Input id="staff-employee-name" className="h-10" disabled={submitting} {...register("employeeName")} />
                    {errors.employeeName && <p className="text-xs text-destructive">{errors.employeeName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-epf-no">EPF No</Label>
                    <Input
                      id="staff-epf-no"
                      className="h-10"
                      disabled={submitting}
                      placeholder="Optional"
                      {...register("epfNo")}
                    />
                    {errors.epfNo && <p className="text-xs text-destructive">{errors.epfNo.message}</p>}
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium">Employment Info</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="staff-email">Email</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      className="h-10"
                      disabled={submitting}
                      {...register("email")}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-department">Department *</Label>
                    <Input
                      id="staff-department"
                      className="h-10"
                      disabled={submitting}
                      {...register("department")}
                    />
                    {errors.department && (
                      <p className="text-xs text-destructive">{errors.department.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <input type="hidden" {...register("status")} />
                    <Select
                      value={watch("status")}
                      onValueChange={(value) =>
                        setValue("status", value as "ACTIVE" | "DISABLED", { shouldDirty: true, shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DISABLED">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium">Contact</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="staff-phone">Phone</Label>
                    <Input
                      id="staff-phone"
                      className="h-10"
                      disabled={submitting}
                      {...register("phoneNumber")}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddStaffOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSave}>
                {submitting ? "Saving..." : editingStaff ? "Save Changes" : "Add Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
  const getDisplayEpf = (item: StaffRecord) => {
    const raw = (item.epfNo || item.epf_no || "").trim();
    if (!raw) return null;
    if (/^legacy-/i.test(raw)) return null;
    return raw;
  };
