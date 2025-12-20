import { z } from "zod";

export const createSubscriptionSchema = z.object({
  tenantId: z.string().min(1),
  provider: z.string().min(1),
  eventType: z.string().min(1),
  targetUrl: z.string().url()
});
