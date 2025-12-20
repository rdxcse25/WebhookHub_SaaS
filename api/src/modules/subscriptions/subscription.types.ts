export interface CreateSubscriptionInput {
  tenantId: string;
  provider: string;
  eventType: string;
  targetUrl: string;
}
