import { Subscription } from "@server/models";

export default function present(subscription: Subscription) {
  return {
    id: subscription.id,
    userId: subscription.userId,
    documentId: subscription.documentId,
    enabled: subscription.enabled,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}
