import { Heartbeat, Monitor, WsEvent } from "../types";

type HeartbeatCallback = (data: { monitor: Monitor; heartbeat: Heartbeat }) => void;
type MonitorUpdateCallback = (data: { monitor: Monitor }) => void;
type MonitorDeleteCallback = (data: { id: string }) => void;
type ConnectionCallback = (isConnected: boolean) => void;

export class TelemetrySocket {
  private static instance: TelemetrySocket;
  private ws: WebSocket | null = null;
  private heartbeatListeners: Set<HeartbeatCallback> = new Set();
  private updateListeners: Set<MonitorUpdateCallback> = new Set();
  private deleteListeners: Set<MonitorDeleteCallback> = new Set();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private reconnectAttempts = 0;
  private isConnected = false;

  public static getInstance(): TelemetrySocket {
    if (!TelemetrySocket.instance) {
      TelemetrySocket.instance = new TelemetrySocket();
    }
    return TelemetrySocket.instance;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnection(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WsEvent = JSON.parse(event.data);
          this.handleEvent(parsed);
        } catch {
          // Non-JSON packet ignored
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyConnection(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleEvent(event: WsEvent): void {
    switch (event.type) {
      case "HEARTBEAT":
        for (const listener of this.heartbeatListeners) {
          listener(event.payload as { monitor: Monitor; heartbeat: Heartbeat });
        }
        break;

      case "MONITOR_UPDATED":
        for (const listener of this.updateListeners) {
          listener(event.payload as { monitor: Monitor });
        }
        break;

      case "MONITOR_DELETED":
        for (const listener of this.deleteListeners) {
          listener(event.payload as { id: string });
        }
        break;
    }
  }

  private notifyConnection(connected: boolean): void {
    for (const listener of this.connectionListeners) {
      listener(connected);
    }
  }

  public onHeartbeat(cb: HeartbeatCallback): () => void {
    this.heartbeatListeners.add(cb);
    return () => this.heartbeatListeners.delete(cb);
  }

  public onMonitorUpdated(cb: MonitorUpdateCallback): () => void {
    this.updateListeners.add(cb);
    return () => this.updateListeners.delete(cb);
  }

  public onMonitorDeleted(cb: MonitorDeleteCallback): () => void {
    this.deleteListeners.add(cb);
    return () => this.deleteListeners.delete(cb);
  }

  public onConnectionChange(cb: ConnectionCallback): () => void {
    this.connectionListeners.add(cb);
    cb(this.isConnected);
    return () => this.connectionListeners.delete(cb);
  }
}
