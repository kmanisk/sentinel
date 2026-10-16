import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyWebsocket from "@fastify/websocket";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { WebSocketService } from "./services/websocket";
import { SchedulerService } from "./services/scheduler";
import { authRoutes } from "./routes/auth";
import { monitorRoutes } from "./routes/monitors";
import { alertRoutes } from "./routes/alerts";
import { healthRoutes } from "./routes/health";

async function bootstrap() {
  const server = Fastify({
    logger: env.NODE_ENV === "development" ? {
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
    } : true,
  });

  // CORS
  await server.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // JWT
  await server.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // WebSocket Server
  await server.register(fastifyWebsocket, {
    options: { maxPayload: 1048576 },
  });

  // WebSocket endpoint for real-time telemetry streaming
  server.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (socket, req) => {
      server.log.info({ ip: req.ip }, "WebSocket client connected");
      WebSocketService.getInstance().register(socket);
    });
  });

  // Mount API Routes
  await server.register(healthRoutes);
  await server.register(authRoutes, { prefix: "/api/auth" });
  await server.register(monitorRoutes, { prefix: "/api/monitors" });
  await server.register(alertRoutes, { prefix: "/api/alerts" });

  // Start HTTP & WebSocket Server
  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    console.log(`[INFO] Sentinel API & Telemetry running on http://${env.HOST}:${env.PORT}`);
    console.log(`[INFO] WebSocket Stream available at ws://${env.HOST}:${env.PORT}/ws`);

    // Initialize Scheduler after DB is reachable
    try {
      await SchedulerService.getInstance().init();
    } catch (dbErr) {
      console.warn("[WARN] Could not connect to database on startup. Scheduler will retry once DB is available.", dbErr);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down Sentinel gracefully...`);
    SchedulerService.getInstance().shutdown();
    await server.close();
    await prisma.$disconnect();
    console.log("Sentinel stopped cleanly.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap();
