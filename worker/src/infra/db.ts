import pkg from "pg";
import { logger } from "./logger.js";
import { config } from "../config/env.js";

const { Pool } = pkg;

export const db = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

/**
 * Handle unexpected pool errors
 */
db.on("error", (err) => {
  logger.fatal({ err }, "💥 Unexpected PostgreSQL pool error");
  process.exit(1);
});

/**
 * Verify DB connectivity on startup
 */
export async function initDb(): Promise<void> {
  try {
    const client = await db.connect();
    await client.query("SELECT 1");
    client.release();

    logger.info("✅ Database connection established");
  } catch (err) {
    logger.fatal({ err }, "❌ Failed to connect to database");
    process.exit(1);
  }
}