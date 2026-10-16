import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AlertService } from "../services/alert";
import { optionalAuthenticate } from "../middleware/auth";

const alertConfigSchema = z.object({
  type: z.enum(["DISCORD", "SLACK", "TELEGRAM", "WEBHOOK"]),
  destination: z.string().min(5, "Destination URL or token is required"),
  monitorId: z.string().optional(),
  isEnabled: z.boolean().default(true),
});

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  // List alerts
  app.get("/", { preHandler: [optionalAuthenticate] }, async (_req, reply) => {
    const alerts = await prisma.alertConfig.findMany({
      include: {
        monitor: {
          select: { id: true, name: true, url: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ alerts });
  });

  // Create alert config
  app.post("/", { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const parse = alertConfigSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Validation failed", details: parse.error.format() });
    }

    const { type, destination, monitorId, isEnabled } = parse.data;

    const alertConfig = await prisma.alertConfig.create({
      data: {
        type,
        destination,
        monitorId: monitorId || null,
        userId: request.user?.id || null,
        isEnabled,
      },
    });

    return reply.status(201).send({ alertConfig });
  });

  // Delete alert config
  app.delete("/:id", { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.alertConfig.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Alert configuration not found" });
    }

    await prisma.alertConfig.delete({ where: { id } });
    return reply.send({ success: true, message: "Alert config deleted" });
  });

  // Test dispatch
  app.post("/:id/test", async (request, reply) => {
    const { id } = request.params as { id: string };

    const config = await prisma.alertConfig.findUnique({
      where: { id },
      include: { monitor: true },
    });

    if (!config) {
      return reply.status(404).send({ error: "Alert config not found" });
    }

    const mockMonitor = config.monitor || {
      id: "mock",
      name: "Sentinel Test Endpoint",
      url: "https://httpbin.org/status/200",
      method: "GET",
      interval: 30,
      timeout: 5000,
      expectedStatus: 200,
      headers: null,
      body: null,
      isActive: true,
      status: "UP",
      lastLatency: 42,
      lastCheckAt: new Date(),
      uptime24h: 100.0,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await AlertService.sendAlert(config, mockMonitor, "TEST", {
        monitorId: mockMonitor.id,
        status: "UP",
        statusCode: 200,
        latency: 42,
      });

      return reply.send({ success: true, message: "Test alert dispatched successfully" });
    } catch (err: unknown) {
      return reply.status(500).send({
        error: "Failed to dispatch test alert",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
