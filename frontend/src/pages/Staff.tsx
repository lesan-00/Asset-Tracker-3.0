import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Eye, Edit, Mail, Phone } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface StaffRecord {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  joinDate: string;
  phoneNumber?: string;
}

interface AdminUserRecord {
  id: string;
  email: string;
}

const defaultForm = {
  name: "",
  email: "",
  department: "",
  position: "",
  joinDate: "",
  phoneNumber: "",
};

export default function Staff() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [usersByEmail, setUsersByEmail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(defaultForm);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffResponse, usersResponse] = await Promise.all([
        apiClient.get<StaffRecord[]>("/staff"),
        apiClient.get<AdminUserRecord[]>("/auth/admin/users"),
      ]);

      const list = Array.isArray(staffResponse)
        ? staffResponse
        : Array.isArray((staffResponse as { data?: unknown }).data)
          ? ((staffResponse as { data: StaffRecord[] }).data)
          : [];
      const users = Array.isArray(usersResponse)
        ? usersResponse
        : Array.isArray((usersResponse as { data?: unknown }).data)
          ? ((usersResponse as { data: AdminUserRecord[] }).data)
          : [];
      setStaff(list);
      const map: Record<string, string> = {};
      users.forEach((u) => {
        map[u.email.toLowerCase()] = u.id;
      });
      setUsersByEmail(map);
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
      item.name.toLowerCase().includes(search.toLowerCase()) ||
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
    setAddStaffOpen(true);
  };

  const handleViewProfile = (staffId: string, email: string) => {
    const userId = usersByEmail[email.toLowerCase()] || staffId;
    if (import.meta.env.DEV) {
      console.log(`[Staff] View Profile clicked for ${userId}`);
    }
    navigate(`/staff/${userId}`);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.department ||
      !formData.position ||
      !formData.joinDate
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/staff", {
        name: formData.name,
        email: formData.email,
        department: formData.department,
        position: formData.position,
        joinDate: new Date(formData.joinDate).toISOString(),
        phoneNumber: formData.phoneNumber || undefined,
      });

      toast({
        title: "Success",
        description: "Staff member added successfully",
      });

      setAddStaffOpen(false);
      setFormData(defaultForm);
      await fetchStaff();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add staff",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
            <p className="text-muted-foreground">
              Manage staff members and their laptop assignments
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
              Manage staff members and their laptop assignments
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
        <p className="text-muted-foreground">
          Manage staff members and their laptop assignments
        </p>
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
        {filteredStaff.map((item) => (
          <div key={item.id} className="rounded-xl border bg-card p-6 card-hover animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary-foreground">
                    {item.name
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.position}</p>
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
                    onClick={() => handleViewProfile(item.id, item.email)}
                  >
                    <Eye className="w-4 h-4" /> View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Edit className="w-4 h-4" /> Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 mb-4">
              <Badge variant="default">active</Badge>
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
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No staff members found matching your criteria.</p>
        </div>
      )}

      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
            <DialogDescription>Create a new staff profile.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Name *</Label>
              <Input
                id="staff-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email *</Label>
              <Input
                id="staff-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-department">Department *</Label>
              <Input
                id="staff-department"
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-position">Position *</Label>
              <Input
                id="staff-position"
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-join-date">Join Date *</Label>
              <Input
                id="staff-join-date"
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, joinDate: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                value={formData.phoneNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                disabled={submitting}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddStaffOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Add Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
