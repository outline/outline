import { Notification } from "@server/models";
import presentUser from "./user";

export default function presentNotification(notification: Notification) {
  return {
    id: notification.id,
    viewedAt: notification.viewedAt,
    createdAt: notification.createdAt,
    event: notification.event,
    userId: notification.userId,
    user: presentUser(notification.user),
    actorId: notification.actorId,
    actor: notification.actor ? presentUser(notification.actor) : undefined,
    commentId: notification.commentId,
    documentId: notification.documentId,
    revisionId: notification.revisionId,
    collectionId: notification.collectionId,
    teamId: notification.teamId,
  };
}
