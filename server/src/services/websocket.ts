import { WebSocket } from "ws";
import { WsMessage } from "../types";

export class WebSocketService {
  private static instance: WebSocketService;
  private clients: Set<WebSocket> = new Set();

  private constructor() {
    // Periodic ping to keep connections alive and detect stale sockets
    setInterval(() => {
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
        } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
          this.clients.delete(client);
        }
      }
    }, 30000);
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public register(socket: WebSocket): void {
    this.clients.add(socket);

    // Send connection greeting
    this.send(socket, {
      type: "CONNECTED",
      payload: { message: "Connected to Sentinel real-time telemetry stream" },
      timestamp: new Date().toISOString(),
    });

    socket.on("close", () => {
      this.clients.delete(socket);
    });

    socket.on("error", () => {
      this.clients.delete(socket);
    });
  }

  public broadcast<T>(message: WsMessage<T>): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  private send<T>(socket: WebSocket, message: WsMessage<T>): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}
