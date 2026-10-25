import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyWebsocket from "@fastify/websocket";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { WebSocketService } from "./services/websocket";
import { SchedulerService } from "./services/scheduler";
import { authRoutes } from "./routes/auth";
import { monitorRoutes } from "./routes/monitors";
import { alertRoutes } from "./routes/alerts";
import { healthRoutes } from "./routes/health";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

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

  // When the frontend has been built alongside the server (for example on
  // Render), serve the Vite output from this Fastify process. The existing
  // Docker setup still works because the client is served separately there
  // and this directory is absent in the server-only image.
  const clientDist = path.resolve(process.cwd(), "../client/dist");
  if (existsSync(clientDist)) {
    server.setNotFoundHandler(async (request, reply) => {
      const pathname = decodeURIComponent(new URL(request.raw.url ?? "/", "http://localhost").pathname);

      if (
        pathname === "/health" ||
        pathname === "/metrics" ||
        pathname === "/ws" ||
        pathname.startsWith("/api/")
      ) {
        return reply.code(404).send({ error: "Not Found" });
      }

      const requestedPath = path.resolve(clientDist, `.${pathname}`);
      const insideClientDist = requestedPath === clientDist || requestedPath.startsWith(`${clientDist}${path.sep}`);

      if (insideClientDist && path.extname(pathname)) {
        try {
          const info = await stat(requestedPath);
          if (info.isFile()) {
            const body = await readFile(requestedPath);
            const contentType = MIME_TYPES[path.extname(requestedPath).toLowerCase()] ?? "application/octet-stream";
            return reply.type(contentType).send(body);
          }
        } catch {
          return reply.code(404).send({ error: "Not Found" });
        }
      }

      const indexHtml = await readFile(path.join(clientDist, "index.html"));
      return reply.type("text/html; charset=utf-8").send(indexHtml);
    });
  }

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
