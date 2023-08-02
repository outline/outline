import { WebhookDelivery } from "@server/models";
import { Event } from "@server/types";

export interface WebhookPayload {
  model: Record<string, unknown> | null;
  id: string;
  [key: string]: unknown;
}

interface WebhookProps {
  event: Event;
  delivery: WebhookDelivery;
  payload: WebhookPayload;
}

export interface WebhookPresentation {
  id: string;
  actorId: string;
  webhookSubscriptionId: string;
  event: string;
  payload: WebhookPayload;
  createdAt: Date;
}

export default function presentWebhook({
  event,
  delivery,
  payload,
}: WebhookProps): WebhookPresentation {
  return {
    id: delivery.id,
    actorId: event.actorId,
    webhookSubscriptionId: delivery.webhookSubscriptionId,
    createdAt: delivery.createdAt,
    event: event.name,
    payload,
  };
}
