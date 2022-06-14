import { WebhookDelivery, WebhookSubscription } from "@server/models";
import { Event } from "@server/types";

interface WebhookProps {
  event: Event;
  delivery: WebhookDelivery;
  subscription: WebhookSubscription;
  payload: { model: unknown; id?: string };
}

export interface WebhookPresentation {
  id: string;
  webhookSubscriptionId: string;
  teamId: string;
  event: string;
  payload: { model: unknown; id?: string };
  createdAt: Date;
}

export default function present({
  event,
  delivery,
  subscription,
  payload,
}: WebhookProps): WebhookPresentation {
  return {
    id: delivery.id,
    webhookSubscriptionId: subscription.id,
    createdAt: delivery.createdAt,
    teamId: subscription.teamId,
    event: event.name,
    payload: payload,
  };
}
