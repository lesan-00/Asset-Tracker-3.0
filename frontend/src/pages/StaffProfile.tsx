import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail, MapPin, Phone, UserCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

type StaffStatus = "ACTIVE" | "DISABLED" | "INACTIVE";

interface StaffProfileData {
  id: string;
  employeeName?: string;
  employee_name?: string;
  epfNo?: string;
  epf_no?: string;
  email?: string;
  department?: string;
  location?: string;
  phoneNumber?: string;
  phone?: string;
  status?: StaffStatus;
  createdAt?: string;
  updatedAt?: string;
  assignedAssets?: Array<{
    assignmentId: string;
    status: string;
    assignedDate: string | null;
    asset: {
      id: number | null;
      assetTag: string;
      assetType: string;
      label: string;
    } | null;
  }>;
}

const editSchema = z.object({
  employeeName: z.string().trim().min(2, "Employee Name must be at least 2 characters"),
  epfNo: z
    .string()
    .optional()
    .transform((value) => (value || "").trim().toUpperCase()),
  department: z.string().trim().optional(),
  location: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[+\-\d\s()]+$/.test(value), "Phone contains invalid characters"),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /\S+@\S+\.\S+/.test(value), "Invalid email format"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function StaffProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      employeeName: "",
      epfNo: "",
      department: "",
      location: "",
      phone: "",
      email: "",
      status: "ACTIVE",
    },
    mode: "onChange",
  });

  const displayName = (profile?.employeeName || profile?.employee_name || "").trim() || "Unnamed staff";
  const displayStatus = normalizeStatus(profile?.status);
  const epfValue = getDisplayEpf(profile?.epfNo || profile?.epf_no);
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-";
  const assignedAssets = Array.isArray(profile?.assignedAssets) ? profile.assignedAssets : [];

  const loadProfile = async () => {
    if (!id) {
      setError("Missing staff id");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<StaffProfileData>(`/staff/${id}`);
      const data = (response as { data?: StaffProfileData }).data ?? (response as StaffProfileData);
      setProfile(data || null);
    } catch (err) {
      setProfile(null);
      setError(
        err instanceof APIClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load staff profile"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [id]);

  const openEdit = () => {
    if (!profile) return;
    reset({
      employeeName: (profile.employeeName || profile.employee_name || "").trim(),
      epfNo: (profile.epfNo || profile.epf_no || "").trim(),
      department: (profile.department || "").trim(),
      location: (profile.location || "").trim(),
      phone: (profile.phoneNumber || profile.phone || "").trim(),
      email: (profile.email || "").trim(),
      status: normalizeStatus(profile.status) === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    });
    setEditOpen(true);
  };

  const onSave = async (values: EditFormValues) => {
    if (!id) return;
    setSaving(true);
    try {
      await apiClient.patch(`/staff/${id}`, {
        employee_name: values.employeeName.trim(),
        epf_no: values.epfNo ? values.epfNo.trim().toUpperCase() || null : null,
        department: values.department?.trim() || null,
        location: values.location?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        status: values.status,
      });

      toast({
        title: "Staff updated",
        description: "Staff profile changes saved successfully.",
      });

      setEditOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-profile", id] }),
      ]);
      await loadProfile();
    } catch (err) {
      const message =
        err instanceof APIClientError && err.status === 409
          ? "EPF No already exists"
          : err instanceof Error
            ? err.message
            : "Failed to update staff profile";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const canSave = useMemo(() => isAdmin && isDirty && isValid && !saving, [isAdmin, isDirty, isValid, saving]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="outline" onClick={() => navigate("/staff")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="p-6 text-muted-foreground">Loading staff profile...</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="outline" onClick={() => navigate("/staff")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="font-medium text-destructive">Unable to load profile</p>
            <p className="mt-1 text-muted-foreground">{error || "Staff not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Button type="button" variant="outline" onClick={() => navigate("/staff")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{displayName}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {epfValue ? `EPF: ${epfValue}` : "EPF: Not Set"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={displayStatus === "ACTIVE" ? "default" : "secondary"}>
                {displayStatus === "ACTIVE" ? "Active" : "Inactive"}
              </Badge>
              {isAdmin ? (
                <Button type="button" variant="outline" onClick={openEdit}>
                  Edit Staff
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InfoRow icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email" value={safeValue(profile.email)} />
          <InfoRow icon={<MapPin className="h-4 w-4 text-muted-foreground" />} label="Department" value={safeValue(profile.department)} />
          <InfoRow icon={<MapPin className="h-4 w-4 text-muted-foreground" />} label="Location" value={safeValue(profile.location)} />
          <InfoRow icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Phone" value={safeValue(profile.phoneNumber || profile.phone)} />
          <InfoRow icon={<UserCircle2 className="h-4 w-4 text-muted-foreground" />} label="Member Since" value={memberSince} />
          <div className="md:col-span-2 mt-2">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-lg font-semibold">Assigned Assets</h3>
              {assignedAssets.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No assignments found for this staff member.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {assignedAssets.map((item) => (
                    <div key={item.assignmentId} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.asset?.label || "Asset not found"}</p>
                        <Badge variant="secondary">{formatAssignmentStatus(item.status)}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Assigned: {item.assignedDate ? new Date(item.assignedDate).toLocaleString() : "-"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
            <DialogDescription>Update employee record details and save changes.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee-name">Employee Name *</Label>
                <Input id="employee-name" {...register("employeeName")} disabled={saving} />
                {errors.employeeName ? <p className="text-xs text-destructive">{errors.employeeName.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="epf-no">EPF No</Label>
                <Input id="epf-no" placeholder="Optional" {...register("epfNo")} disabled={saving} />
                {errors.epfNo ? <p className="text-xs text-destructive">{errors.epfNo.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" {...register("department")} disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...register("location")} disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} disabled={saving} />
                {errors.phone ? <p className="text-xs text-destructive">{errors.phone.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} disabled={saving} />
                {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <input type="hidden" {...register("status")} />
                <Select
                  value={watch("status")}
                  onValueChange={(value) => setValue("status", value as "ACTIVE" | "INACTIVE", { shouldDirty: true, shouldValidate: true })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSave}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function safeValue(value?: string) {
  const normalized = (value || "").trim();
  return normalized.length > 0 ? normalized : "-";
}

function normalizeStatus(status?: StaffStatus): "ACTIVE" | "INACTIVE" {
  const normalized = String(status || "").toUpperCase();
  return normalized === "ACTIVE" ? "ACTIVE" : "INACTIVE";
}

function getDisplayEpf(value?: string) {
  const normalized = (value || "").trim();
  if (!normalized) return null;
  if (/^legacy-/i.test(normalized)) return null;
  return normalized;
}

function formatAssignmentStatus(value: string) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}
