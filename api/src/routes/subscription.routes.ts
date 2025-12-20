import { FastifyInstance } from "fastify";
import { subscriptionController } from "../modules/subscriptions/subscription.controller.js";

export async function registerSubscriptionRoutes(app: FastifyInstance) {
  app.post("/", subscriptionController.create);
  app.get("/", subscriptionController.list);
  app.patch(
    "/:id/disable",
    subscriptionController.disable
  );
  app.patch(
    "/:id/rotate-secret",
    subscriptionController.rotateSecret
  );
}
