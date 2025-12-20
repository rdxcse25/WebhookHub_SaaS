import { logger } from "../infra/logger.js";

export async function processStripeEvent(event: any) {
  logger.info(
    {
      eventId: event.eventId,
      eventType: event.eventType
    },
    "Processing Stripe event"
  );

  // ⚠️ Next phase:
  // - Load subscriptions
  // - Deliver webhook
}
