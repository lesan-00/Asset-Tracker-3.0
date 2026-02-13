import { Laptop, CheckCircle, Wrench, AlertTriangle, Users, Archive, Bell, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentAssignments } from '@/components/dashboard/RecentAssignments';
import { StatusChart } from '@/components/dashboard/StatusChart';
import { OpenIssues } from '@/components/dashboard/OpenIssues';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary] = useState<any | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleViewIssues = () => {
    if (import.meta.env.DEV) console.log('[Dashboard] Navigating to Issues');
    navigate('/issues');
  };

  const handleViewActivityLog = () => {
    if (import.meta.env.DEV) console.log('[Dashboard] Navigating to Assignments');
    navigate('/assignments');
  };

  useEffect(() => {
    const loadSummary = async () => {
      setLoadingSummary(true);
      try {
        const resp = await apiClient.get('/dashboard/summary');
        const data = (resp as any).data ?? resp;
        setSummary(data || null);
      } catch (err) {
        setError('Failed to load dashboard summary');
      } finally {
        setLoadingSummary(false);
      }
    };

    const loadActivity = async () => {
      setLoadingActivity(true);
      try {
        const resp = await apiClient.get('/dashboard/activity?limit=10');
        const data = (resp as any).data ?? resp;
        setActivity(Array.isArray(data) ? data : []);
      } catch (err) {
        // ignore
      } finally {
        setLoadingActivity(false);
      }
    };

    loadSummary();
    loadActivity();
  }, []);

  const timeAgo = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your laptop asset inventory and assignments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Laptops" value={summary?.totalLaptops ?? '—'} icon={Laptop} variant="primary" />
        <StatCard title="Available" value={summary?.available ?? '—'} icon={CheckCircle} variant="accent" />
        <StatCard title="Assigned" value={summary?.assigned ?? '—'} icon={Users} />
        <StatCard title="Under Repair" value={summary?.underRepair ?? '—'} icon={Wrench} variant="warning" />
        <StatCard title="Open Issues" value={summary?.openIssues ?? '—'} icon={AlertTriangle} variant="danger" />
        <StatCard title="Pending Acceptance" value={summary?.pendingAcceptances ?? '—'} icon={Archive} />
      </div>

      {/* Alerts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Panel */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Alerts</h3>
          </div>
          <div className="space-y-4">
            {loadingSummary ? (
              <p className="text-muted-foreground">Loading alerts...</p>
            ) : (
              <>
                {user?.role === 'ADMIN' ? (
                  <>
                    <p className="text-sm">Pending Acceptances: {summary?.pendingAcceptances ?? 0}</p>
                    <p className="text-sm">Pending Return Approvals: {summary?.pendingReturnApprovals ?? 0}</p>
                    <p className="text-sm">Open Issues: {summary?.openIssues ?? 0}</p>
                    <Button onClick={() => navigate('/assignments')} variant="outline" className="w-full" type="button">Review Assignments</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm">My assigned laptop: {summary?.assignedLaptop ? `${summary.assignedLaptop.brand} ${summary.assignedLaptop.model}` : 'None'}</p>
                    <Button onClick={() => navigate('/assignments')} variant="outline" className="w-full" type="button">View My Assignments</Button>
                  </>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Recent Activity Panel */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Recent Activity</h3>
          </div>
          <div className="space-y-4">
            {loadingActivity ? (
              <p className="text-muted-foreground">Loading activity...</p>
            ) : (
              <>
                {activity.length === 0 ? (
                  <p className="text-muted-foreground">No recent activity</p>
                ) : (
                  <ul className="space-y-2">
                    {activity.map((ev) => (
                      <li key={ev.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm"><strong>{ev.actorName || 'System'}</strong> {ev.action} <span className="text-muted-foreground">({ev.category})</span></p>
                          <p className="text-xs text-muted-foreground">{timeAgo(ev.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Button onClick={handleViewActivityLog} variant="outline" className="w-full" type="button">View Activity Log</Button>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart />
        <OpenIssues />
      </div>

      {/* Recent Activity */}
      <RecentAssignments />
    </div>
  );
}
