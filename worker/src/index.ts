import { initKafkaConsumer } from "./infra/kafka.js";
import { initDb } from "./infra/db.js";
import { startEventConsumer } from "./consumers/event.consumer.js";
import { logger } from "./infra/logger.js";

async function startWorker() {
  await initDb();
  await initKafkaConsumer();
  await startEventConsumer();

  logger.info("🚀 Worker started");
}

startWorker().catch((err) => {
  logger.fatal({ err }, "❌ Worker crashed");
  process.exit(1);
});
