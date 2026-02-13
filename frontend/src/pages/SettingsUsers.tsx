import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

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
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, "ADMIN" | "STAFF">>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

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

  const hasChanges = useMemo(
    () => users.some((u) => roleDrafts[u.id] && roleDrafts[u.id] !== u.role),
    [users, roleDrafts]
  );

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-muted-foreground">Manage user access and roles</p>
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
          {loading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : (
            users.map((user) => (
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
    </div>
  );
}
