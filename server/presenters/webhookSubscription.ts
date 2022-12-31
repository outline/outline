import { WebhookSubscription } from "@server/models";

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
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
}
