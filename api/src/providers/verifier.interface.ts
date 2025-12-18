/**
 * Contract that every webhook provider verifier must implement
 *
 * The verifier is responsible ONLY for:
 * - Authenticating the webhook request
 * - Extracting a stable event ID
 * - Returning a normalized payload
 */
export interface WebhookVerifier {
  verify(args: {
    /**
     * Raw request body (required for signature verification)
     */
    rawBody: Buffer;

    /**
     * Request headers (provider-specific usage)
     */
    headers: Record<string, unknown>;

    /**
     * Secret used to verify authenticity
     * (later: tenant-specific secret)
     */
    secret: string;
  }): {
    /**
     * Provider-generated unique event ID
     * Used for idempotency
     */
    eventId: string;

    /**
     * Full, verified payload
     */
    payload: unknown;

    /**
     * Optional event type (e.g. stripe event type)
     */
    eventType?: string;
  };
}
