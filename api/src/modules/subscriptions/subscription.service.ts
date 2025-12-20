import { subscriptionRepository } from "./subscription.repository.js";
import { randomBytes } from "crypto";

export const subscriptionService = {
  async create(input: {
    tenantId: string;
    provider: string;
    eventType: string;
    targetUrl: string;
  }) {
    const secret = randomBytes(32).toString("hex");

    const subscription = await subscriptionRepository.create({
      ...input,
      secret
    });

    return {
      id: subscription.id,
      secret
    };
  },

  async list(tenantId: string) {
    return subscriptionRepository.list(tenantId);
  },

  async disable(id: string) {
    await subscriptionRepository.disable(id);
  },

  async rotateSecret(id: string) {
    const secret = randomBytes(32).toString("hex");
    await subscriptionRepository.rotateSecret(id, secret);
    return secret;
  }
};
