import { Monitor } from "@prisma/client";
import { prisma } from "../db/prisma";
import { PingerService } from "./pinger";
import { WebSocketService } from "./websocket";
import { AlertService } from "./alert";

export class SchedulerService {
  private static instance: SchedulerService;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isChecking: Set<string> = new Set();

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Boots up the scheduler and loads all active monitors
   */
  public async init(): Promise<void> {
    console.log("[INFO] Initializing Sentinel Scheduler Engine...");
    const monitors = await prisma.monitor.findMany({
      where: { isActive: true },
    });

    console.log(`Loaded ${monitors.length} active monitor(s) into scheduler.`);
    for (const monitor of monitors) {
      this.scheduleMonitor(monitor);
    }
  }

  /**
   * Schedules recurring ping checks for a specific monitor
   */
  public scheduleMonitor(monitor: Monitor): void {
    this.stopMonitor(monitor.id);

    if (!monitor.isActive) return;

    // Run first check immediately with a staggered offset
    const jitter = Math.floor(Math.random() * 2000);
    setTimeout(() => {
      this.executeCheck(monitor.id);
    }, jitter);

    // Schedule recurring interval
    const intervalMs = Math.max(monitor.interval, 5) * 1000;
    const timer = setInterval(() => {
      this.executeCheck(monitor.id);
    }, intervalMs);

    this.timers.set(monitor.id, timer);
  }

  /**
   * Halts recurring checks for a monitor
   */
  public stopMonitor(monitorId: string): void {
    const timer = this.timers.get(monitorId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(monitorId);
    }
  }

  /**
   * Executes a single ping check, records metrics, computes uptime, and broadcasts
   */
  public async executeCheck(monitorId: string): Promise<void> {
    if (this.isChecking.has(monitorId)) {
      return; // Prevent overlapping runs if previous ping is still resolving
    }

    this.isChecking.add(monitorId);

    try {
      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
      });

      if (!monitor || !monitor.isActive) {
        this.stopMonitor(monitorId);
        return;
      }

      const previousStatus = monitor.status;
      const result = await PingerService.ping(monitor);

      // 1. Record heartbeat time-series entry
      const heartbeat = await prisma.heartbeat.create({
        data: {
          monitorId: monitor.id,
          status: result.status,
          statusCode: result.statusCode,
          latency: result.latency,
          dnsTime: result.dnsTime,
          tcpTime: result.tcpTime,
          ttfb: result.ttfb,
          error: result.error,
        },
      });

      // 2. Compute rolling 24h uptime percentage
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [totalChecks, upChecks] = await Promise.all([
        prisma.heartbeat.count({
          where: {
            monitorId: monitor.id,
            createdAt: { gte: oneDayAgo },
          },
        }),
        prisma.heartbeat.count({
          where: {
            monitorId: monitor.id,
            createdAt: { gte: oneDayAgo },
            status: { in: ["UP", "DEGRADED"] },
          },
        }),
      ]);

      const uptime24h = totalChecks > 0 ? Number(((upChecks / totalChecks) * 100).toFixed(2)) : 100.0;

      // 3. Update monitor record
      const updatedMonitor = await prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          status: result.status,
          lastLatency: result.latency,
          lastCheckAt: new Date(),
          uptime24h,
        },
      });

      // 4. Broadcast live update to all connected WebSocket clients
      const ws = WebSocketService.getInstance();
      ws.broadcast({
        type: "HEARTBEAT",
        payload: {
          monitor: updatedMonitor,
          heartbeat,
        },
        timestamp: new Date().toISOString(),
      });

      // 5. Evaluate state transition for alerting & incidents
      await AlertService.handleStateChange(updatedMonitor, previousStatus, result);
    } catch (err) {
      console.error(`Error executing check for monitor ${monitorId}:`, err);
    } finally {
      this.isChecking.delete(monitorId);
    }
  }

  /**
   * Graceful shutdown of all active intervals
   */
  public shutdown(): void {
    console.log("Shutting down scheduler timers...");
    for (const [id, timer] of this.timers.entries()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}
