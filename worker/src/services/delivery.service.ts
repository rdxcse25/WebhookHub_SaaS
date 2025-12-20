import crypto from "crypto";
import axios from "axios";

import { logger } from "../infra/logger.js";
import {
  markProcessing,
  markDelivered,
  markFailed
} from "../state/event.state.js";

interface DeliverEventInput {
  tenantId: string;
  provider: string;
  eventId: string;
  eventType?: string;
  payload: unknown;

  targetUrl: string;
  secret: string;
}

class DeliveryService {
  async deliverEvent(input: DeliverEventInput): Promise<void> {
    const {
      tenantId,
      provider,
      eventId,
      eventType,
      payload,
      targetUrl,
      secret
    } = input;

    logger.info(
      { tenantId, provider, eventId },
      "🚚 Starting webhook delivery"
    );

    /**
     * 1️⃣ Acquire idempotency lock
     */
    const locked = await markProcessing(
      tenantId,
      provider,
      eventId
    );

    if (!locked) {
      logger.warn(
        { tenantId, provider, eventId },
        "⚠️ Event already processed or in-flight"
      );
      return;
    }

    /**
     * 2️⃣ Build payload
     */
    const body = JSON.stringify({
      id: eventId,
      provider,
      type: eventType,
      data: payload,
      deliveredAt: new Date().toISOString()
    });

    /**
     * 3️⃣ Generate signature
     */
    const signature = this.signPayload(secret, body);

    /**
     * 4️⃣ Deliver webhook
     */
    try {
      const res = await axios.post(targetUrl, body, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event-Id": eventId,
          "X-Webhook-Provider": provider
        },
        timeout: 5000
      });

      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Non-2xx response: ${res.status}`);
      }

      /**
       * 5️⃣ Mark SUCCESS
       */
      await markDelivered(
        tenantId,
        provider,
        eventId
      );

      logger.info(
        { tenantId, provider, eventId },
        "✅ Webhook delivered successfully"
      );
    } catch (err: any) {
      logger.error(
        {
          tenantId,
          provider,
          eventId,
          error: err?.message
        },
        "❌ Webhook delivery failed"
      );

      await markFailed(
        tenantId,
        provider,
        eventId,
        err?.message ?? "DELIVERY_FAILED"
      );

      throw err;
    }
  }

  private signPayload(secret: string, payload: string): string {
    return (
      "sha256=" +
      crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex")
    );
  }
}

export const deliveryService = new DeliveryService();
