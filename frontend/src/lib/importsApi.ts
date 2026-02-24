import { apiClient } from "@/lib/apiClient";

export interface ImportResponse {
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    insertedRows?: number;
  };
  columns: string[];
  rows: Array<Record<string, unknown>>;
  errors: Array<{ row: number; message: string }>;
}

export const importsApi = {
  async downloadStaffTemplate(): Promise<string> {
    const response = await fetch("/api/imports/staff/template", {
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

  async previewStaff(fileName: string, fileContentBase64: string): Promise<ImportResponse> {
    const response = await apiClient.post<ImportResponse>("/imports/staff/preview", {
      fileName,
      fileContentBase64,
    });
    return ((response as any)?.data ?? null) as ImportResponse;
  },

  async confirmStaff(fileName: string, fileContentBase64: string): Promise<ImportResponse> {
    const response = await apiClient.post<ImportResponse>("/imports/staff/confirm", {
      fileName,
      fileContentBase64,
    });
    return ((response as any)?.data ?? null) as ImportResponse;
  },
};

