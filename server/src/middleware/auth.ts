import { FastifyReply, FastifyRequest } from "fastify";
import { AuthUserPayload } from "../types";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: AuthUserPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing or invalid authorization header" });
    }

    const payload = await request.jwtVerify<AuthUserPayload>();
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}

export async function optionalAuthenticate(request: FastifyRequest): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      request.user = await request.jwtVerify<AuthUserPayload>();
    }
  } catch {
    // Ignore error for optional authentication
  }
}
