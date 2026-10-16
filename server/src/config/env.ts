import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgresql://sentinel:sentinel_secret@localhost:5432/sentinel_db?schema=public"),
  JWT_SECRET: z.string().default("super_secret_jwt_key_replace_in_production_sentinel_xyz123"),
  CORS_ORIGIN: z.string().default("*"),
  CHECK_CONCURRENCY: z.coerce.number().default(10),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[ERROR] Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
