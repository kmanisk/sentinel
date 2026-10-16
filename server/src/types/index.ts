export type MonitorStatus = "UP" | "DOWN" | "DEGRADED" | "PENDING";

export interface PingResult {
  monitorId: string;
  status: MonitorStatus;
  statusCode?: number;
  latency: number;
  dnsTime?: number;
  tcpTime?: number;
  ttfb?: number;
  error?: string;
}

export interface WsMessage<T = unknown> {
  type: "HEARTBEAT" | "MONITOR_UPDATED" | "MONITOR_DELETED" | "INCIDENT_ALERT" | "CONNECTED";
  payload: T;
  timestamp: string;
}

export interface AuthUserPayload {
  id: string;
  email: string;
  role: string;
}

export interface CreateMonitorInput {
  name: string;
  url: string;
  method?: string;
  interval?: number;
  timeout?: number;
  expectedStatus?: number;
  headers?: Record<string, string>;
  body?: string;
}

export interface UpdateMonitorInput extends Partial<CreateMonitorInput> {
  isActive?: boolean;
}
