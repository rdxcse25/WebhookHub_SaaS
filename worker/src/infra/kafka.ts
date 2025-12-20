import { Kafka, Consumer } from "kafkajs";
import { logger } from "./logger.js";

const kafka = new Kafka({
  clientId: "webhookhub-worker",
  brokers: process.env.KAFKA_BROKERS!.split(","),
  retry: {
    retries: 5
  }
});

export let consumer: Consumer;

/**
 * Initialize Kafka consumer
 */
export async function initKafkaConsumer(): Promise<void> {
  consumer = kafka.consumer({
    groupId: "webhookhub-workers"
  });

  try {
    await consumer.connect();
    logger.info("✅ Kafka consumer connected");
  } catch (err) {
    logger.fatal({ err }, "❌ Failed to connect Kafka consumer");
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    try {
      logger.info("🛑 Shutting down Kafka consumer...");
      await consumer.disconnect();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "❌ Error during Kafka shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
