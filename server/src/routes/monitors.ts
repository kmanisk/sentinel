import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { SchedulerService } from "../services/scheduler";
import { WebSocketService } from "../services/websocket";
import { PingerService } from "../services/pinger";
import { optionalAuthenticate } from "../middleware/auth";

const monitorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  url: z.string().url("Must be a valid URL"),
  method: z.enum(["GET", "POST", "HEAD", "PUT", "DELETE"]).default("GET"),
  interval: z.coerce.number().min(5).max(3600).default(30),
  timeout: z.coerce.number().min(500).max(30000).default(5000),
  expectedStatus: z.coerce.number().min(100).max(599).default(200),
  headers: z.string().optional(),
  body: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function monitorRoutes(app: FastifyInstance): Promise<void> {
  // List all monitors with sparkline telemetry
  app.get("/", { preHandler: [optionalAuthenticate] }, async (_req, reply) => {
    const monitors = await prisma.monitor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        heartbeats: {
          take: 20,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            latency: true,
            createdAt: true,
          },
        },
      },
    });

    return reply.send({ monitors });
  });

  // Get single monitor with incidents & full stats
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        incidents: {
          take: 10,
          orderBy: { startedAt: "desc" },
        },
        alertConfigs: true,
      },
    });

    if (!monitor) {
      return reply.status(404).send({ error: "Monitor not found" });
    }

    return reply.send({ monitor });
  });

  // Create new monitor
  app.post("/", { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const parse = monitorSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Validation failed", details: parse.error.format() });
    }

    const data = parse.data;
    const userId = request.user?.id || null;

    const monitor = await prisma.monitor.create({
      data: {
        name: data.name,
        url: data.url,
        method: data.method,
        interval: data.interval,
        timeout: data.timeout,
        expectedStatus: data.expectedStatus,
        headers: data.headers || null,
        body: data.body || null,
        isActive: data.isActive,
        userId,
      },
    });

    // Schedule into live runner immediately
    if (monitor.isActive) {
      SchedulerService.getInstance().scheduleMonitor(monitor);
    }

    // Broadcast creation
    WebSocketService.getInstance().broadcast({
      type: "MONITOR_UPDATED",
      payload: { monitor },
      timestamp: new Date().toISOString(),
    });

    return reply.status(201).send({ monitor });
  });

  // Update existing monitor
  app.put("/:id", { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = monitorSchema.partial().safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: "Validation failed", details: parse.error.format() });
    }

    const existing = await prisma.monitor.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Monitor not found" });
    }

    const updated = await prisma.monitor.update({
      where: { id },
      data: parse.data,
    });

    // Reschedule or stop
    if (updated.isActive) {
      SchedulerService.getInstance().scheduleMonitor(updated);
    } else {
      SchedulerService.getInstance().stopMonitor(updated.id);
    }

    WebSocketService.getInstance().broadcast({
      type: "MONITOR_UPDATED",
      payload: { monitor: updated },
      timestamp: new Date().toISOString(),
    });

    return reply.send({ monitor: updated });
  });

  // Delete monitor
  app.delete("/:id", { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.monitor.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Monitor not found" });
    }

    SchedulerService.getInstance().stopMonitor(id);

    await prisma.monitor.delete({ where: { id } });

    WebSocketService.getInstance().broadcast({
      type: "MONITOR_DELETED",
      payload: { id },
      timestamp: new Date().toISOString(),
    });

    return reply.send({ success: true, message: "Monitor deleted successfully" });
  });

  // Instant on-demand manual check
  app.post("/:id/check", async (request, reply) => {
    const { id } = request.params as { id: string };

    const monitor = await prisma.monitor.findUnique({ where: { id } });
    if (!monitor) {
      return reply.status(404).send({ error: "Monitor not found" });
    }

    const result = await PingerService.ping(monitor);
    return reply.send({ result });
  });

  // Time-series metrics for charts
  app.get("/:id/metrics", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string; range?: string };
    const limit = Math.min(Number(query.limit) || 100, 500);

    const heartbeats = await prisma.heartbeat.findMany({
      where: { monitorId: id },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        statusCode: true,
        latency: true,
        dnsTime: true,
        ttfb: true,
        error: true,
        createdAt: true,
      },
    });

    // Return chronological order for charts (oldest -> newest)
    return reply.send({
      metrics: heartbeats.reverse(),
    });
  });
}
