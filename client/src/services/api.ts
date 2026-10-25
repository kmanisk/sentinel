import { AlertConfig, Heartbeat, Monitor, User } from "../types";

const API_BASE = "/api";

export type OAuthProvider = "google" | "github";

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem("sentinel_token");
  }

  public static setToken(token: string | null): void {
    if (token) {
      localStorage.setItem("sentinel_token", token);
    } else {
      localStorage.removeItem("sentinel_token");
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };

    const hasContentType = Object.keys(headers).some(
      (key) => key.toLowerCase() === "content-type"
    );

    // Fastify rejects an empty request body when Content-Type is application/json.
    // Only advertise JSON when this request actually carries a JSON payload.
    if (typeof options.body === "string" && !hasContentType) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const data = await response.json();
        if (data.error) errorMessage = data.error;
      } catch {
        // Keep the HTTP fallback message.
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  public static async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    this.setToken(res.token);
    return res;
  }

  public static async register(data: { email: string; password: string; name?: string }): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.setToken(res.token);
    return res;
  }

  public static async getAuthProviders(): Promise<{ providers: Record<OAuthProvider, boolean> }> {
    return this.request<{ providers: Record<OAuthProvider, boolean> }>("/auth/providers");
  }

  public static startOAuth(provider: OAuthProvider): void {
    window.location.assign(`${API_BASE}/auth/oauth/${provider}`);
  }

  public static async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>("/auth/me");
  }

  public static logout(): void {
    this.setToken(null);
  }

  public static async getMonitors(): Promise<{ monitors: Monitor[] }> {
    return this.request<{ monitors: Monitor[] }>("/monitors");
  }

  public static async getMonitor(id: string): Promise<{ monitor: Monitor }> {
    return this.request<{ monitor: Monitor }>(`/monitors/${id}`);
  }

  public static async createMonitor(data: Partial<Monitor>): Promise<{ monitor: Monitor }> {
    return this.request<{ monitor: Monitor }>("/monitors", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async updateMonitor(id: string, data: Partial<Monitor>): Promise<{ monitor: Monitor }> {
    return this.request<{ monitor: Monitor }>(`/monitors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public static async deleteMonitor(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/monitors/${id}`, {
      method: "DELETE",
    });
  }

  public static async triggerCheck(id: string): Promise<{ result: Heartbeat }> {
    return this.request<{ result: Heartbeat }>(`/monitors/${id}/check`, {
      method: "POST",
    });
  }

  public static async getMetrics(id: string, limit: number = 60): Promise<{ metrics: Heartbeat[] }> {
    return this.request<{ metrics: Heartbeat[] }>(`/monitors/${id}/metrics?limit=${limit}`);
  }

  public static async getAlerts(): Promise<{ alerts: AlertConfig[] }> {
    return this.request<{ alerts: AlertConfig[] }>("/alerts");
  }

  public static async createAlert(data: {
    type: "DISCORD" | "SLACK" | "TELEGRAM" | "WEBHOOK";
    destination: string;
    monitorId?: string;
  }): Promise<{ alertConfig: AlertConfig }> {
    return this.request<{ alertConfig: AlertConfig }>("/alerts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async deleteAlert(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/alerts/${id}`, {
      method: "DELETE",
    });
  }

  public static async testAlert(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/alerts/${id}/test`, {
      method: "POST",
    });
  }
}
