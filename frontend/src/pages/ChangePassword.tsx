import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, setUserProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "All fields are required.",
        variant: "destructive",
      });
      return;
    }
    if (formData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post<any>("/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      const updatedUser = ((response as any)?.data ?? null) as typeof user | null;
      if (updatedUser) {
        setUserProfile(updatedUser);
      }
      toast({
        title: "Password updated",
        description: "You can now continue to the dashboard.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 py-4">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Your password was reset by an administrator. You must set a new password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                disabled={saving}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

