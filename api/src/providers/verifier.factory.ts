import { StripeVerifier } from "./stripe.verifier.js";
import type { WebhookVerifier } from "./verifier.interface.js";

/**
 * Registry of supported webhook providers
 *
 * Key   → provider name in URL
 * Value → verifier implementation
 */
const verifierRegistry: Record<string, WebhookVerifier> = {
  stripe: new StripeVerifier()
  // razorpay: new RazorpayVerifier(),
  // github: new GithubVerifier()
};

/**
 * Get verifier for a given provider
 *
 * @throws Error if provider is unsupported
 */
export function getVerifier(provider: string): WebhookVerifier {
  const verifier = verifierRegistry[provider];

  if (!verifier) {
    throw new Error(`Unsupported webhook provider: ${provider}`);
  }

  return verifier;
}
