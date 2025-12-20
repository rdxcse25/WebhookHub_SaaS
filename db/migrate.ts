import fs from "fs";
import path from "path";
import pkg from "pg";

const { Client } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

async function runMigrations() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const applied = await client.query<{ version: string }>(
    "SELECT version FROM schema_migrations"
  );

  const appliedVersions = new Set(
    applied.rows.map((r) => r.version)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (appliedVersions.has(file)) continue;

    console.log(`📦 Applying migration: ${file}`);
    const sql = fs.readFileSync(
      path.join(MIGRATIONS_DIR, file),
      "utf8"
    );

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`❌ Migration failed: ${file}`);
      throw err;
    }
  }

  await client.end();
  console.log("✅ Database migrations complete");
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
