import { apiClient } from "@/lib/apiClient";
import type { AssetType } from "@/lib/assetsApi";

export interface DashboardActivityItem {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalAssets: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  warrantyExpiringSoon: number;
  recentActivity: DashboardActivityItem[];
}

export const dashboardApi = {
  async getDashboardSummary(params?: { type?: AssetType }): Promise<DashboardSummary | null> {
    const query = new URLSearchParams();
    if (params?.type) query.set("type", params.type);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get<DashboardSummary>(`/assets/summary${suffix}`);
    return ((response as any)?.data ?? null) as DashboardSummary | null;
  },
};

