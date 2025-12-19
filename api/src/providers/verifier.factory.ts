import { StripeVerifier } from "./stripe.verifier.js";
import { WebhookVerifier } from "./verifier.interface.js";

const stripeVerifier = new StripeVerifier();

export const verifierFactory = {
  get(provider: string): WebhookVerifier {
    switch (provider) {
      case "stripe":
        return stripeVerifier;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
};
