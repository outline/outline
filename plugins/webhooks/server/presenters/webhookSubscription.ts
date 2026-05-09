import type { WebhookSubscription } from "@server/models";
import presentUser from "@server/presenters/user";

export default function presentWebhookSubscription(
  webhook: WebhookSubscription
) {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    secret: webhook.secret,
    events: webhook.events,
    enabled: webhook.enabled,
    createdBy: webhook.createdBy ? presentUser(webhook.createdBy) : undefined,
    createdById: webhook.createdById,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
}
