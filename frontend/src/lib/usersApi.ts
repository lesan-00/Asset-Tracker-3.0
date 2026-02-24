import { apiClient } from "@/lib/apiClient";

export type ProfileStatus = "ACTIVE" | "DISABLED";

export interface UserProfile {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "STAFF";
  department?: string;
  location?: string;
  phone?: string;
  phoneNumber?: string;
  status: ProfileStatus;
  createdAt: string;
  lastLoginAt?: string | null;
  accessGroups: string[];
  accessLevel: string;
  userCode?: string;
  username?: string;
  employeeName?: string;
  epfNo?: string;
}

export interface UpdateUserProfilePayload {
  fullName?: string;
  email?: string;
  department?: string;
  location?: string;
  phoneNumber?: string;
  status?: ProfileStatus;
  accessGroups?: string[];
  accessLevel?: string;
}

export const usersApi = {
  async getMe(): Promise<UserProfile | null> {
    const response = await apiClient.get<UserProfile>("/users/me");
    return ((response as any)?.data ?? null) as UserProfile | null;
  },

  async getUser(id: string): Promise<UserProfile | null> {
    const response = await apiClient.get<UserProfile>(`/users/${id}`);
    return ((response as any)?.data ?? null) as UserProfile | null;
  },

  async updateUser(id: string, payload: UpdateUserProfilePayload): Promise<UserProfile | null> {
    const response = await apiClient.patch<UserProfile>(`/users/${id}`, payload);
    return ((response as any)?.data ?? null) as UserProfile | null;
  },
};
