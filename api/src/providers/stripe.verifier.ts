import Stripe from "stripe";
import type { WebhookVerifier } from "./verifier.interface.js";

/**
 * Stripe SDK instance
 *
 * NOTE:
 * - API key is NOT required for webhook verification
 * - We pass a dummy key to satisfy the SDK
 */
const stripe = new Stripe("dummy", {
  apiVersion: "2025-12-15.clover"
});

export class StripeVerifier implements WebhookVerifier {
  verify(
    args: Parameters<WebhookVerifier["verify"]>[0]
  ) {
    const { rawBody, headers, secret } = args;
    const signature = headers["stripe-signature"];

    if (!signature || typeof signature !== "string") {
      throw new Error("Missing Stripe signature");
    }

    /**
     * Stripe performs cryptographic verification here
     */
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      secret
    );

    return {
      eventId: event.id,
      payload: event,
      eventType: event.type
    };
  }
}
