export type MonitorStatus = "UP" | "DOWN" | "DEGRADED" | "PENDING";

export interface Heartbeat {
  id: string;
  monitorId?: string;
  status: MonitorStatus;
  statusCode?: number;
  latency: number;
  dnsTime?: number;
  tcpTime?: number;
  ttfb?: number;
  error?: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  status: "DOWN" | "RESOLVED";
  error?: string;
  startedAt: string;
  resolvedAt?: string;
  duration?: number;
}

export interface AlertConfig {
  id: string;
  type: "DISCORD" | "SLACK" | "TELEGRAM" | "WEBHOOK";
  destination: string;
  monitorId?: string | null;
  monitor?: { id: string; name: string; url: string };
  isEnabled: boolean;
  createdAt: string;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: string;
  interval: number;
  timeout: number;
  expectedStatus: number;
  headers?: string | null;
  body?: string | null;
  isActive: boolean;
  status: MonitorStatus;
  lastLatency?: number | null;
  lastCheckAt?: string | null;
  uptime24h: number;
  heartbeats?: Heartbeat[];
  incidents?: Incident[];
  alertConfigs?: AlertConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
}

export interface WsEvent<T = unknown> {
  type: "HEARTBEAT" | "MONITOR_UPDATED" | "MONITOR_DELETED" | "INCIDENT_ALERT" | "CONNECTED";
  payload: T;
  timestamp: string;
}
