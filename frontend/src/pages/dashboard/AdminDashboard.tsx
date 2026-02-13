import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ClipboardList, Laptop, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient, APIClientError } from "@/lib/apiClient";

interface AdminSummary {
  role: "ADMIN";
  totalLaptops: number;
  available: number;
  assigned: number;
  underRepair: number;
  openIssues: number;
  pendingAcceptances: number;
  pendingReturnApprovals: number;
}

interface ActivityEvent {
  id: string;
  category: "assignment" | "issue";
  action: string;
  actorName: string;
  createdAt: string;
}

interface IssueItem {
  id: string;
  title: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [openIssues, setOpenIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryResp, activityResp, issuesResp] = await Promise.all([
          apiClient.get<AdminSummary>("/dashboard/summary"),
          apiClient.get<ActivityEvent[]>("/dashboard/activity?limit=10"),
          apiClient.get<IssueItem[]>("/issues?status=open"),
        ]);

        setSummary(((summaryResp as any).data ?? null) as AdminSummary | null);
        setActivity(Array.isArray((activityResp as any).data) ? (activityResp as any).data : []);
        setOpenIssues(Array.isArray((issuesResp as any).data) ? (issuesResp as any).data : []);
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
        label: "Pending assignment acceptances",
        count: summary.pendingAcceptances,
        link: "/assignments",
      });
    }
    if (summary.pendingReturnApprovals > 0) {
      items.push({
        label: "Pending return approvals",
        count: summary.pendingReturnApprovals,
        link: "/assignments",
      });
    }
    if (summary.openIssues > 0) {
      items.push({ label: "Open issues", count: summary.openIssues, link: "/issues" });
    }
    return items;
  }, [summary]);

  const v = (n?: number) => (typeof n === "number" ? String(n) : "-");
  const visibleActivity = expanded ? activity : activity.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Operational overview and quick actions</p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
        <Card><CardHeader><CardTitle className="text-sm">Total Laptops</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v(summary?.totalLaptops)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Available</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v(summary?.available)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Assigned</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v(summary?.assigned)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Under Repair</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v(summary?.underRepair)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Open Issues</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v(summary?.openIssues)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Pending Acceptance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v(summary?.pendingAcceptances)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Pending Returns</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v(summary?.pendingReturnApprovals)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate("/laptops")}><Laptop className="h-4 w-4" />Manage Laptops</Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate("/assignments")}><ClipboardList className="h-4 w-4" />Assignments</Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate("/staff")}><Users className="h-4 w-4" />Manage Staff</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-muted-foreground">Loading alerts...</p>}
            {!loading && alerts.length === 0 && (
              <p className="text-muted-foreground">No actionable alerts.</p>
            )}
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
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 transition-all duration-300">
            {loading && <p className="text-muted-foreground">Loading activity...</p>}
            {!loading && activity.length === 0 && (
              <p className="text-muted-foreground">No recent activity.</p>
            )}
            {!loading &&
              visibleActivity.map((event) => (
                <div key={event.id} className="rounded-md border p-3">
                  <p className="text-sm">
                    <strong>{event.actorName || "System"}</strong> {event.action.replaceAll("_", " ")} ({event.category})
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(event.createdAt)}</p>
                </div>
              ))}
            {!loading && activity.length > 5 && (
              <div className="flex justify-center pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-1 transition-all duration-300"
                  onClick={() => setExpanded((prev) => !prev)}
                >
                  {expanded ? "Show Less" : "Show More"}
                  <ChevronDown
                    className={`h-4 w-4 transition-all duration-300 ${expanded ? "rotate-180" : "rotate-0"}`}
                  />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Open Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-muted-foreground">Loading issues...</p>}
          {!loading && openIssues.length === 0 && (
            <p className="text-muted-foreground">No open issues.</p>
          )}
          {!loading &&
            openIssues.slice(0, 10).map((issue) => (
              <div key={issue.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{issue.title}</p>
                  <p className="text-xs text-muted-foreground">{issue.priority} priority</p>
                </div>
                <Badge variant="outline">{issue.status.replace("_", " ")}</Badge>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
