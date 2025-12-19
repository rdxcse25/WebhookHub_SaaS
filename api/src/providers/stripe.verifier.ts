import crypto from "crypto";
import { WebhookVerifier } from "./verifier.interface.js";

export class StripeVerifier implements WebhookVerifier {
  verify(
    args: Parameters<WebhookVerifier["verify"]>[0]
  ) {
    const { rawBody, headers, secret } = args;
    const signature =
      headers["x-signature"] || headers["stripe-signature"];

    if (!signature || typeof signature !== "string") {
      throw new Error("Missing signature");
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expected, "hex")
      )
    ) {
      throw new Error("Invalid signature");
    }

    const payload = JSON.parse(rawBody.toString("utf8"));

    return {
      eventId: payload.id,
      eventType: payload.type,
      payload
    };
  }
}
