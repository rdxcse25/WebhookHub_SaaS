import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Environment variable schema
 * Fail fast if anything is missing or invalid
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 8080)),

  // Database
  DATABASE_URL: z.string().min(1),

  // Kafka
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_INGEST_TOPIC: z.string().default("events_ingested"),

  // Redis
  REDIS_URL: z.string().min(1),

  // Security
  WEBHOOKHUB_HMAC_SECRET: z.string().min(10),

  STRIPE_SIGNING_SECRET: z.string().min(10),

  // Observability
  SERVICE_NAME: z.string().default("webhookhub-api")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables");
  console.error(parsed.error.format());
  process.exit(1);
}

/**
 * Typed, validated config object
 */
export const config = {
  NODE_ENV: parsed.data.NODE_ENV,
  PORT: parsed.data.PORT,

  DATABASE_URL: parsed.data.DATABASE_URL,

  KAFKA_BROKERS: parsed.data.KAFKA_BROKERS,
  KAFKA_INGEST_TOPIC: parsed.data.KAFKA_INGEST_TOPIC,

  REDIS_URL: parsed.data.REDIS_URL,

  WEBHOOKHUB_HMAC_SECRET: parsed.data.WEBHOOKHUB_HMAC_SECRET,
  STRIPE_SIGNING_SECRET: parsed.data.STRIPE_SIGNING_SECRET,

  SERVICE_NAME: parsed.data.SERVICE_NAME
};
