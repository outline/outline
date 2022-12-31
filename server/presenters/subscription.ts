import { Subscription } from "@server/models";

export default function presentSubscription(subscription: Subscription) {
  return {
    id: subscription.id,
    userId: subscription.userId,
    documentId: subscription.documentId,
    event: subscription.event,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}
