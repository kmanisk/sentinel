import { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma";
import { WebSocketService } from "../services/websocket";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_req, reply) => {
    return reply.send({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  app.get("/metrics", async (_req, reply) => {
    const [monitorsCount, heartbeatsCount, openIncidentsCount] = await Promise.all([
      prisma.monitor.count(),
      prisma.heartbeat.count(),
      prisma.incident.count({ where: { resolvedAt: null } }),
    ]);

    const memory = process.memoryUsage();

    return reply.send({
      monitors: monitorsCount,
      heartbeats: heartbeatsCount,
      openIncidents: openIncidentsCount,
      activeWsClients: WebSocketService.getInstance().getConnectedClientsCount(),
      system: {
        nodeVersion: process.version,
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      },
    });
  });
}
