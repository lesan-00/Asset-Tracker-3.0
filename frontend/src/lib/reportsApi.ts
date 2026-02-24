import { apiClient } from "@/lib/apiClient";

export type ReportFormat = "xlsx" | "pdf";

export interface IssueSummaryResponse {
  categoryCounts: Array<{ category: string; count: number }>;
  statusCounts: Array<{ status: string; count: number }>;
  assetTypeCounts: Array<{ assetType: string; count: number }>;
  problematicAssets: Array<{
    assetTag: string;
    assetType: string;
    imeiNo: string;
    brand: string;
    model: string;
    issuesCount: number;
  }>;
}

const buildQuery = (params: Record<string, string | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim()) query.set(key, value.trim());
  });
  return query.toString() ? `?${query.toString()}` : "";
};

const downloadReport = async (
  endpoint: string,
  params: Record<string, string | undefined>,
  format: ReportFormat
) => {
  const token = localStorage.getItem("token");
  const query = buildQuery({ ...params, format });
  const response = await fetch(`/api/reports${endpoint}${query}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = "Failed to download report";
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // Ignore non-json errors
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
  const fileName =
    fileNameMatch?.[1] || `report.${format === "xlsx" ? "xlsx" : "pdf"}`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const reportsApi = {
  getAssetRegister(filters: {
    type?: string;
    status?: string;
    location?: string;
    department?: string;
    search?: string;
  }) {
    return apiClient.get(`/reports/assets/register${buildQuery(filters)}`);
  },

  exportAssetRegister(
    filters: {
      type?: string;
      status?: string;
      location?: string;
      department?: string;
      search?: string;
    },
    format: ReportFormat
  ) {
    return downloadReport("/assets/register/export", filters, format);
  },

  getActiveAssignments(filters: { targetType?: string; search?: string }) {
    return apiClient.get(`/reports/assignments/active${buildQuery(filters)}`);
  },

  exportActiveAssignments(
    filters: { targetType?: string; search?: string },
    format: ReportFormat
  ) {
    return downloadReport("/assignments/active/export", filters, format);
  },

  getIssueSummary(filters: { from?: string; to?: string }) {
    return apiClient.get<IssueSummaryResponse>(`/reports/issues/summary${buildQuery(filters)}`);
  },

  exportIssueSummary(filters: { from?: string; to?: string }, format: ReportFormat) {
    return downloadReport("/issues/summary/export", filters, format);
  },

  getAssignmentHistory(filters: { from?: string; to?: string; search?: string }) {
    return apiClient.get(`/reports/assignments/history${buildQuery(filters)}`);
  },

  exportAssignmentHistory(
    filters: { from?: string; to?: string; search?: string },
    format: ReportFormat
  ) {
    return downloadReport("/assignments/history/export", filters, format);
  },
};
