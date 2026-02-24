import { apiClient } from "@/lib/apiClient";

export interface RevertAssignmentResponse<TAssignment = unknown> {
  success: boolean;
  data: TAssignment;
  message?: string;
}

export const assignmentsApi = {
  async revertAssignment<TAssignment = unknown>(
    assignmentId: string,
    payload?: { reason?: string }
  ): Promise<RevertAssignmentResponse<TAssignment>> {
    const response = await apiClient.post<RevertAssignmentResponse<TAssignment>>(
      `/assignments/${assignmentId}/revert`,
      payload ?? {}
    );
    return response as RevertAssignmentResponse<TAssignment>;
  },
};

