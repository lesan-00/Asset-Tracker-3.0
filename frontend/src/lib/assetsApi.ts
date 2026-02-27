import { apiClient } from "@/lib/apiClient";

export type AssetType =
  | "LAPTOP"
  | "PRINTER"
  | "SWITCH"
  | "ROUTER"
  | "DESKTOP"
  | "PDA"
  | "HCS_CRANE_SCALE"
  | "MOBILE_PHONE"
  | "SYSTEM_UNIT"
  | "MONITOR"
  | "KEYBOARD"
  | "MOUSE"
  | "HEADSET";
export type AssetStatus = "IN_STOCK" | "ASSIGNED" | "IN_REPAIR" | "RETIRED";

export interface Asset {
  id: number;
  assetTag: string;
  assetType: AssetType;
  brand: string;
  model: string;
  imeiNo?: string | null;
  serialNumber?: string | null;
  specifications?: string | null;
  department?: string | null;
  status: AssetStatus;
  location: string;
  purchaseDate?: string | null;
  warrantyEndDate?: string | null;
  notes?: string | null;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetSummary {
  totalAssets: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  warrantyExpiringSoon: number;
  recentActivity: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: string;
    message: string;
    createdAt: string;
  }>;
}

export interface AssetImportPreview {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  previewRows: Array<Record<string, unknown>>;
  errors: Array<{ row: number; message: string }>;
}

export interface AssetImportResult {
  totalRows: number;
  insertedCount: number;
  failedCount: number;
  errors: Array<{ row: number; message: string }>;
}

export interface PaginatedList<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AssetDeleteResult {
  assetId: number;
  assetTag: string;
  deleted: {
    assignments: number;
    issues: number;
    activityLogs: number;
    notifications: number;
    asset: number;
  };
}

export const assetsApi = {
  async list(params?: {
    type?: AssetType | "all";
    status?: AssetStatus | "all";
    location?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedList<Asset>> {
    const query = new URLSearchParams();
    if (params?.type && params.type !== "all") query.set("type", params.type);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.location && params.location !== "all") query.set("location", params.location);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get<PaginatedList<Asset>>(`/assets${suffix}`);
    return {
      data: Array.isArray((response as any)?.data) ? (response as any).data : [],
      page: Number((response as any)?.page || params?.page || 1),
      pageSize: Number((response as any)?.pageSize || params?.pageSize || 25),
      total: Number((response as any)?.total || 0),
      totalPages: Number((response as any)?.totalPages || 1),
    };
  },

  async getById(id: number): Promise<Asset | null> {
    const response = await apiClient.get<Asset>(`/assets/${id}`);
    return ((response as any)?.data ?? null) as Asset | null;
  },

  async create(payload: Omit<Asset, "id" | "createdAt" | "updatedAt" | "assignedTo">): Promise<Asset | null> {
    const response = await apiClient.post<Asset>("/assets", payload);
    return ((response as any)?.data ?? null) as Asset | null;
  },

  async update(
    id: number,
    payload: Partial<Omit<Asset, "id" | "createdAt" | "updatedAt" | "assignedTo">>
  ): Promise<Asset | null> {
    const response = await apiClient.put<Asset>(`/assets/${id}`, payload);
    return ((response as any)?.data ?? null) as Asset | null;
  },

  async remove(id: number): Promise<AssetDeleteResult | null> {
    const response = await apiClient.delete<AssetDeleteResult>(`/assets/${id}`);
    return ((response as any)?.data ?? null) as AssetDeleteResult | null;
  },

  async summary(): Promise<AssetSummary | null> {
    const response = await apiClient.get<AssetSummary>("/assets/summary");
    return ((response as any)?.data ?? null) as AssetSummary | null;
  },

  async assignable(params?: {
    type?: AssetType | "all";
    search?: string;
  }): Promise<Asset[]> {
    const query = new URLSearchParams();
    if (params?.type && params.type !== "all") query.set("type", params.type);
    if (params?.search) query.set("search", params.search);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get<Asset[]>(`/assets/assignable${suffix}`);
    return Array.isArray((response as any)?.data) ? (response as any).data : [];
  },

  async downloadImportTemplate(): Promise<string> {
    const response = await fetch("/api/assets/import/template", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to download template");
    }
    return response.text();
  },

  async previewImport(fileName: string, fileContentBase64: string): Promise<AssetImportPreview> {
    const response = await apiClient.post<AssetImportPreview>("/assets/import/preview", {
      fileName,
      fileContentBase64,
    });
    return ((response as any)?.data ?? null) as AssetImportPreview;
  },

  async importAssets(fileName: string, fileContentBase64: string): Promise<AssetImportResult> {
    const response = await apiClient.post<AssetImportResult>("/assets/import", {
      fileName,
      fileContentBase64,
    });
    return ((response as any)?.data ?? null) as AssetImportResult;
  },
};
