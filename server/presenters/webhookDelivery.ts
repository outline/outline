import { WebhookDelivery } from "@server/models";

export default function present(webhook: WebhookDelivery) {
  return {
    id: webhook.id,
    status: webhook.status,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
}
