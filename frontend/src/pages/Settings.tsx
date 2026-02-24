import { useEffect, useState } from "react";
import { Save, Database, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

interface AppSettings {
  primaryDepartment: string;
}

const defaultSettings: AppSettings = {
  primaryDepartment: "IT Department",
};

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<AppSettings>("/settings");
        const data = (response as { data?: AppSettings }).data ?? (response as AppSettings);
        if (data && data.primaryDepartment) {
          setSettings(data);
        } else {
          setSettings(defaultSettings);
        }
      } catch (error) {
        // If settings don't exist yet, use defaults
        setSettings(defaultSettings);
        if (import.meta.env.DEV) {
          console.log(
            "[Settings] Using default settings (backend may not have data yet)"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [isAdmin, toast]);

  const handleNavigateUsers = () => {
    if (import.meta.env.DEV) {
      console.log("[Settings] Manage Users & Roles clicked");
    }
    navigate("/settings/users");
  };

  const handleSaveChanges = async () => {
    if (!isAdmin) return;

    if (import.meta.env.DEV) {
      console.log("[Settings] Save Changes clicked", settings);
    }

    // Validate required fields
    if (!settings.primaryDepartment.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await apiClient.put("/settings", {
        primaryDepartment: settings.primaryDepartment,
      });
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof APIClientError
            ? error.message
            : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Configure system preferences and administrative controls."
            : "Configure personal preferences and account settings."}
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>Basic system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Organization Name</Label>
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  Browns Plantations
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Primary Department</Label>
                <Input
                  id="department"
                  value={settings.primaryDepartment}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, primaryDepartment: e.target.value }))
                  }
                  disabled={loading || saving}
                  placeholder="e.g., IT Department"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Switch between light and dark mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 rounded-md border p-4 transition-colors">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle" className="text-sm font-medium">
                Dark Mode
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Light / Dark</span>
                <Switch
                  id="theme-toggle"
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                  aria-label="Toggle dark mode"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>User Management</CardTitle>
            </div>
            <CardDescription>Manage system users and their permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={handleNavigateUsers}
              disabled={loading || saving}
            >
              Manage Users & Roles
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <div className="flex justify-end">
          <Button
            type="button"
            className="gap-2"
            onClick={handleSaveChanges}
            disabled={loading || saving}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
