import { WebhookDelivery } from "@server/models";
import { Event } from "@server/types";

interface WebhookProps {
  event: Event;
  delivery: WebhookDelivery;
  payload: { model: unknown; id?: string };
}

export interface WebhookPresentation {
  id: string;
  webhookSubscriptionId: string;
  event: string;
  payload: { model: unknown; id?: string };
  createdAt: Date;
}

export default function present({
  event,
  delivery,
  payload,
}: WebhookProps): WebhookPresentation {
  return {
    id: delivery.id,
    webhookSubscriptionId: delivery.webhookSubscriptionId,
    createdAt: delivery.createdAt,
    event: event.name,
    payload: payload,
  };
}
