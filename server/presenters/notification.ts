import type { Notification } from "@server/models";
import type { APIContext } from "@server/types";
import type { presentDocumentTag } from "./tag";
import presentUser from "./user";
import { presentComment, presentDocument, loadDocumentTags } from ".";

type Options = {
  /**
   * Pre-resolved presented tags for this notification's document, set by
   * `presentNotifications` to batch-load tags for many notifications in a
   * single query. When omitted, `presentDocument` loads the document's own
   * tags itself, in a single-document batch.
   */
  tags?: ReturnType<typeof presentDocumentTag>[];
  /** Include the document's tags, defaults to true. */
  includeTags?: boolean;
};

export default async function presentNotification(
  ctx: APIContext | undefined,
  notification: Notification,
  options: Options = {}
) {
  return {
    id: notification.id,
    viewedAt: notification.viewedAt,
    accessRequestId: notification.accessRequestId,
    accessRequestStatus: notification.accessRequest?.status,
    archivedAt: notification.archivedAt,
    createdAt: notification.createdAt,
    event: notification.event,
    userId: notification.userId,
    actorId: notification.actorId,
    actor: notification.actor ? presentUser(notification.actor) : undefined,
    commentId: notification.commentId,
    comment: notification.comment
      ? presentComment(notification.comment)
      : undefined,
    documentId: notification.documentId,
    document: notification.document
      ? await presentDocument(ctx, notification.document, {
          tags: options.tags,
          includeTags: options.includeTags,
        })
      : undefined,
    revisionId: notification.revisionId,
    collectionId: notification.collectionId,
    data: notification.data,
  };
}

/**
 * Batch-present multiple notifications, loading the tags for every
 * referenced document in a single query instead of one per notification.
 *
 * @param ctx the API context.
 * @param notifications the notifications to present.
 * @returns array of presented notification objects.
 */
export async function presentNotifications(
  ctx: APIContext | undefined,
  notifications: Notification[]
) {
  const documentIds = notifications
    .map((notification) => notification.documentId)
    .filter((id): id is string => !!id);
  const tagsByDocumentId = await loadDocumentTags(documentIds);

  return Promise.all(
    notifications.map((notification) =>
      presentNotification(ctx, notification, {
        tags: notification.documentId
          ? (tagsByDocumentId.get(notification.documentId) ?? [])
          : undefined,
      })
    )
  );
}
