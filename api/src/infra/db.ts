import { Pool } from "pg";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

/**
 * PostgreSQL connection pool
 *
 * This pool is shared across the entire service.
 */
export const db = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,                  // max connections in pool
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 5000
});

/**
 * Verify DB connectivity at startup
 */
export async function initDb(): Promise<void> {
  try {
    const client = await db.connect();
    await client.query("SELECT 1");
    client.release();

    logger.info("✅ Database connection established");
  } catch (err) {
    logger.error({ err }, "❌ Failed to connect to database");
    process.exit(1); // fail fast
  }
}

/**
 * Graceful shutdown
 */
export async function closeDb(): Promise<void> {
  logger.info("Closing database connections...");
  await db.end();
}
