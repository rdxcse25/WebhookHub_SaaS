import { Kafka, Producer } from "kafkajs";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

/**
 * Kafka client
 */
const kafka = new Kafka({
  clientId: config.SERVICE_NAME,
  brokers: config.KAFKA_BROKERS.split(","),
  retry: {
    retries: 5
  }
});

let producer: Producer | null = null;

/**
 * Initialize Kafka producer
 */
export async function initKafkaProducer(): Promise<void> {
  producer = kafka.producer({
    allowAutoTopicCreation: true
  });

  try {
    await producer.connect();
    logger.info("✅ Kafka producer connected");
  } catch (err) {
    logger.error({ err }, "❌ Failed to connect Kafka producer");
    process.exit(1); // fail fast
  }
}

/**
 * Publish webhook event to Kafka
 */
export async function publishEventToKafka(args: {
  tenantId: string;
  provider: string;
  eventId: string;
  eventType?: string;
  payload: unknown;
}): Promise<void> {
  if (!producer) {
    throw new Error("Kafka producer not initialized");
  }

  const {
    tenantId,
    provider,
    eventId,
    eventType,
    payload
  } = args;

  const message = {
    key: `${tenantId}:${provider}:${eventId}`,
    value: JSON.stringify({
      tenantId,
      provider,
      eventId,
      eventType,
      payload,
      publishedAt: new Date().toISOString()
    })
  };

  await producer.send({
    topic: config.KAFKA_INGEST_TOPIC,
    messages: [message]
  });

  logger.debug(
    { tenantId, provider, eventId },
    "Event published to Kafka"
  );
}

/**
 * Graceful shutdown
 */
export async function closeKafkaProducer(): Promise<void> {
  if (producer) {
    logger.info("Closing Kafka producer...");
    await producer.disconnect();
  }
}
