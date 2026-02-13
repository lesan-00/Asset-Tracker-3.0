/**
 * Centralized API Client
 * Handles:
 * - JWT token injection
 * - Safe JSON parsing
 * - Consistent error handling
 * - 401 handling (auth redirect)
 * - Development logging
 */

export interface ApiError {
  status: number;
  message: string;
  code: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class APIClient {
  private baseURL = "/api";

  /**
   * Main request handler
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const token = localStorage.getItem("token");

    // Build a Headers instance from any provided headers so we can use .set()
    const headers = new Headers(options.headers);

    // Ensure JSON content type is set unless caller provided one
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Attach JWT token if available
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type");
      let data: any = null;

      // Safe JSON parsing - handle empty or non-JSON responses
      if (contentType?.includes("application/json")) {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseErr) {
            console.error(`Failed to parse JSON from ${endpoint}:`, parseErr);
            throw new Error("Invalid response format from server");
          }
        }
      } else {
        data = await response.text();
      }

      // Handle 401 - token expired or invalid
      if (response.status === 401) {
        console.warn("Received 401 - clearing auth and redirecting to login");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw this.createError(401, "Session expired", "UNAUTHORIZED");
      }

      // Handle other error statuses
      if (!response.ok) {
        const errorMsg = data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`API Error [${endpoint}]:`, {
          status: response.status,
          message: errorMsg,
          data,
        });
        throw this.createError(response.status, errorMsg, "API_ERROR");
      }

      // Success response
      if (dev) {
        console.log(`API Success [${endpoint}]:`, {
          status: response.status,
          data,
        });
      }

      return data || { success: true };
    } catch (error) {
      // Network error or parsing error
      if (error instanceof APIClientError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Network request failed";
      console.error(`Network Error [${endpoint}]:`, message);
      throw this.createError(0, message, "NETWORK_ERROR");
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  /**
   * Health check - returns true if backend is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Create a consistent error object
   */
  private createError(status: number, message: string, code: string): APIClientError {
    const error = new APIClientError(message);
    error.status = status;
    error.code = code;
    return error;
  }
}

/**
 * Custom error class for API errors
 */
export class APIClientError extends Error {
  status: number = 0;
  code: string = "UNKNOWN";

  constructor(message: string) {
    super(message);
    this.name = "APIClientError";
  }
}

// Development flag
const dev = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

export const apiClient = new APIClient();
