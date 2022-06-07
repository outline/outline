import { WebhookDelivery, WebhookSubscription } from "@server/models";
import { Event } from "@server/types";

interface Props {
  event: Event;
  delivery: WebhookDelivery;
  subscription: WebhookSubscription;
  modelPayload: unknown;
}

export interface WebhookPresentation {
  id: string;
  webhookSubscriptionId: string;
  teamId: string;
  event: string;
  payload: { model: unknown };
  createdAt: Date;
}

export default function present({
  event,
  delivery,
  subscription,
  modelPayload,
}: Props): WebhookPresentation {
  return {
    id: delivery.id,
    webhookSubscriptionId: subscription.id,
    createdAt: delivery.createdAt,
    teamId: subscription.teamId,
    event: event.name,
    payload: { model: modelPayload },
  };
}
