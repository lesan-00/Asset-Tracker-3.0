import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
}

export default function SettingsUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, "ADMIN" | "STAFF">>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMode, setResetMode] = useState<"generate" | "manual">("generate");
  const [manualPassword, setManualPassword] = useState("");
  const [manualConfirmPassword, setManualConfirmPassword] = useState("");
  const [resettingUser, setResettingUser] = useState<UserRecord | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<UserRecord[]>("/auth/admin/users");
      const data = Array.isArray(response)
        ? response
        : Array.isArray((response as { data?: unknown }).data)
          ? ((response as { data: UserRecord[] }).data)
          : [];
      setUsers(data);
      const initialDrafts: Record<string, "ADMIN" | "STAFF"> = {};
      data.forEach((u) => {
        initialDrafts[u.id] = u.role;
      });
      setRoleDrafts(initialDrafts);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof APIClientError ? error.message : "Failed to load users",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const hasChanges = useMemo(
    () => users.some((u) => roleDrafts[u.id] && roleDrafts[u.id] !== u.role),
    [users, roleDrafts]
  );

  const filteredAndSortedUsers = useMemo(() => {
    const q = debouncedSearchTerm.trim().toLowerCase();
    const filtered = users.filter((user) => {
      const name = (user.fullName || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    const rolePriority = (role: UserRecord["role"]) => (role === "ADMIN" ? 0 : 1);

    return filtered
      .map((user, index) => ({ user, index }))
      .sort((a, b) => {
        const roleDiff = rolePriority(a.user.role) - rolePriority(b.user.role);
        if (roleDiff !== 0) return roleDiff;

        const aName = (a.user.fullName || a.user.email || "").toLowerCase();
        const bName = (b.user.fullName || b.user.email || "").toLowerCase();
        const nameDiff = aName.localeCompare(bName, undefined, { sensitivity: "base" });
        if (nameDiff !== 0) return nameDiff;

        return a.index - b.index;
      })
      .map((entry) => entry.user);
  }, [users, debouncedSearchTerm]);

  const handleSaveUserRole = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    const nextRole = roleDrafts[userId];
    if (!user || !nextRole || nextRole === user.role) return;

    setSavingUserId(userId);
    try {
      await apiClient.patch(`/auth/admin/users/${userId}/role`, { role: nextRole });
      toast({
        title: "Success",
        description: "User role updated",
      });
      await loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof APIClientError ? error.message : "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const handleOpenReset = (user: UserRecord) => {
    setResettingUser(user);
    setResetMode("generate");
    setManualPassword("");
    setManualConfirmPassword("");
    setGeneratedPassword(null);
    setResetOpen(true);
  };

  const handleSubmitReset = async () => {
    if (!resettingUser) return;

    if (resetMode === "manual") {
      if (!manualPassword || !manualConfirmPassword) {
        toast({
          title: "Error",
          description: "Enter and confirm the temporary password.",
          variant: "destructive",
        });
        return;
      }
      if (manualPassword.length < 8) {
        toast({
          title: "Error",
          description: "Temporary password must be at least 8 characters.",
          variant: "destructive",
        });
        return;
      }
      if (manualPassword !== manualConfirmPassword) {
        toast({
          title: "Error",
          description: "Password and confirmation do not match.",
          variant: "destructive",
        });
        return;
      }
    }

    setResetSubmitting(true);
    try {
      const payload =
        resetMode === "generate"
          ? { generate: true }
          : { tempPassword: manualPassword };
      const response = await apiClient.post<any>(
        `/admin/users/${resettingUser.id}/reset-password`,
        payload
      );

      const tempPassword = (response as any)?.data?.tempPassword;
      if (typeof tempPassword === "string" && tempPassword.length > 0) {
        setGeneratedPassword(tempPassword);
      }

      toast({
        title: "Password reset successfully",
        description:
          "Share this password securely. User will be required to change it on next login.",
      });

      if (!tempPassword) {
        setResetOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof APIClientError ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleCopyGeneratedPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast({
        title: "Copied",
        description: "Temporary password copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy password. Copy it manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-muted-foreground">Manage user access permissions and role assignments.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate("/settings")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Role Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
            {!loading && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredAndSortedUsers.length} of {users.length} users
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : filteredAndSortedUsers.length === 0 ? (
            <p className="text-muted-foreground">No users match your search.</p>
          ) : (
            filteredAndSortedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={roleDrafts[user.id] || user.role}
                    onValueChange={(value: "ADMIN" | "STAFF") =>
                      setRoleDrafts((prev) => ({ ...prev, [user.id]: value }))
                    }
                    disabled={savingUserId === user.id}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="STAFF">STAFF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={() => handleSaveUserRole(user.id)}
                    disabled={savingUserId === user.id || roleDrafts[user.id] === user.role}
                  >
                    {savingUserId === user.id ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenReset(user)}
                    disabled={currentUser?.id === user.id}
                  >
                    Reset Password
                  </Button>
                </div>
              </div>
            ))
          )}
          {!loading && hasChanges && (
            <p className="text-sm text-muted-foreground">
              Unapplied role changes exist. Click Save on each changed user.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) {
            setGeneratedPassword(null);
            setManualPassword("");
            setManualConfirmPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              This will set a temporary password for{" "}
              <span className="font-medium">{resettingUser?.email || "this user"}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup
              value={resetMode}
              onValueChange={(value) => setResetMode(value as "generate" | "manual")}
              className="space-y-2"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="generate" id="mode-generate" />
                <span>Generate temporary password automatically</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="manual" id="mode-manual" />
                <span>Set temporary password manually</span>
              </label>
            </RadioGroup>

            {resetMode === "manual" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="manual-temp-password">Temporary Password</Label>
                  <Input
                    id="manual-temp-password"
                    type="password"
                    value={manualPassword}
                    onChange={(event) => setManualPassword(event.target.value)}
                    disabled={resetSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-confirm-password">Confirm Temporary Password</Label>
                  <Input
                    id="manual-confirm-password"
                    type="password"
                    value={manualConfirmPassword}
                    onChange={(event) => setManualConfirmPassword(event.target.value)}
                    disabled={resetSubmitting}
                  />
                </div>
              </div>
            )}

            {generatedPassword && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Temporary Password</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={generatedPassword} />
                  <Button type="button" variant="outline" onClick={() => void handleCopyGeneratedPassword()}>
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this password securely. User will be required to change it on next login.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)} disabled={resetSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSubmitReset()} disabled={resetSubmitting}>
              {resetSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
