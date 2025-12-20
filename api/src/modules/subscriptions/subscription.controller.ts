import { FastifyRequest, FastifyReply } from "fastify";
import { subscriptionService } from "./subscription.service.js";
import { createSubscriptionSchema } from "./subscription.schema.js";

export const subscriptionController = {
  async create(req: FastifyRequest, reply: FastifyReply) {
    const body = createSubscriptionSchema.parse(req.body);
    const result = await subscriptionService.create(body);
    reply.code(201).send(result);
  },

  async list(req: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = req.query as { tenantId: string };
    const result = await subscriptionService.list(tenantId);
    reply.send(result);
  },

  async disable(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    await subscriptionService.disable(id);
    reply.send({ status: "disabled" });
  },

  async rotateSecret(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const secret = await subscriptionService.rotateSecret(id);
    reply.send({ secret });
  }
};
