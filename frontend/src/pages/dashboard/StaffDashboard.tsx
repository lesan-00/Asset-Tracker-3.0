import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Bug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient, APIClientError } from "@/lib/apiClient";

interface AssignedLaptop {
  assetTag?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  status?: string;
  warrantyExpiry?: string;
  accessoriesIssued?: string[];
}

interface StaffSummary {
  role: "STAFF";
  assignedLaptop: AssignedLaptop | null;
  myOpenIssuesCount: number;
  myPendingActionsCount: number;
  pendingAcceptances: number;
  pendingReturnFollowUp: number;
}

interface IssueItem {
  id: string;
  title: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  laptop?: {
    assetTag?: string;
    brand?: string;
    model?: string;
  };
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryResp, issuesResp] = await Promise.all([
          apiClient.get<StaffSummary>("/dashboard/summary"),
          apiClient.get<IssueItem[]>("/issues?status=open"),
        ]);

        setSummary(((summaryResp as any).data ?? null) as StaffSummary | null);
        setIssues(Array.isArray((issuesResp as any).data) ? (issuesResp as any).data : []);
      } catch (err) {
        if (err instanceof APIClientError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const alerts = useMemo(() => {
    if (!summary) return [];
    const items: Array<{ label: string; count: number; link: string }> = [];
    if (summary.pendingAcceptances > 0) {
      items.push({
        label: "Assignments pending your acceptance",
        count: summary.pendingAcceptances,
        link: "/assignments",
      });
    }
    if (summary.pendingReturnFollowUp > 0) {
      items.push({
        label: "Return requests needing re-submission",
        count: summary.pendingReturnFollowUp,
        link: "/assignments",
      });
    }
    if (summary.myOpenIssuesCount > 0) {
      items.push({ label: "My open issues", count: summary.myOpenIssuesCount, link: "/issues" });
    }
    return items;
  }, [summary]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Dashboard</h1>
        <p className="text-muted-foreground">Overview of assigned assets and operational status.</p>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6 text-muted-foreground">Loading dashboard...</CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="p-6 text-destructive">Failed to load dashboard: {error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">My Open Issues</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary?.myOpenIssuesCount ?? "-"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">My Pending Actions</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary?.myPendingActionsCount ?? "-"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Pending Acceptance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary?.pendingAcceptances ?? "-"}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Assigned Laptop</CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.assignedLaptop ? (
            <div className="space-y-1">
              <p className="font-medium">
                {summary.assignedLaptop.brand || "-"} {summary.assignedLaptop.model || ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Asset Tag: {summary.assignedLaptop.assetTag || "-"}
              </p>
              <p className="text-sm text-muted-foreground">
                Serial: {summary.assignedLaptop.serialNumber || "-"}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {summary.assignedLaptop.status || "-"}
              </p>
              {summary.assignedLaptop.accessoriesIssued && summary.assignedLaptop.accessoriesIssued.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.assignedLaptop.accessoriesIssued.map((item) => (
                    <Badge key={item} variant="secondary">{item}</Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No active laptop assignment.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-muted-foreground">Loading alerts...</p>}
          {!loading && alerts.length === 0 && <p className="text-muted-foreground">No alerts.</p>}
          {!loading &&
            alerts.map((alert) => (
              <div key={alert.label} className="flex items-center justify-between rounded-md border p-3">
                <p className="text-sm">{alert.label}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{alert.count}</Badge>
                  <Button size="sm" variant="outline" onClick={() => navigate(alert.link)}>
                    View
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate("/issues")}>
            <Bug className="h-4 w-4" />
            Issues page
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate("/assignments")}>
            <ArrowLeftRight className="h-4 w-4" />
            Assignments page
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Open Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-muted-foreground">Loading issues...</p>}
          {!loading && issues.length === 0 && (
            <p className="text-muted-foreground">No open issues.</p>
          )}
          {!loading &&
            issues.slice(0, 10).map((issue) => (
              <div key={issue.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{issue.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {issue.laptop?.assetTag || "-"} {issue.laptop?.brand || ""} {issue.laptop?.model || ""}
                  </p>
                </div>
                <Badge variant="outline">{issue.status.replace("_", " ")}</Badge>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
