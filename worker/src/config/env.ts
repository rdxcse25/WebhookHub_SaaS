export const config = {
  KAFKA_BROKERS: process.env.KAFKA_BROKERS!,
  KAFKA_INGEST_TOPIC: process.env.KAFKA_INGEST_TOPIC!,
  DATABASE_URL: process.env.DATABASE_URL!,
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || "5", 10),
};
