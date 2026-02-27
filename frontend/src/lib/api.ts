const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (!configuredApiUrl) {
  console.error(
    "VITE_API_URL is undefined. Set VITE_API_URL to your deployed backend API base URL."
  );
}
const API_BASE = configuredApiUrl ? configuredApiUrl.replace(/\/+$/, "") : "";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add Bearer token if available
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Handle 401 - token expired or invalid
    if (response.status === 401) {
      // Clear auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Redirect to login
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};
