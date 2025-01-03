import { createContext } from "@server/context";
import { Subscription, Document } from "@server/models";
import { sequelize } from "@server/storage/database";
import { APIContext, DocumentEvent, RevisionEvent } from "@server/types";

type Props = {
  /** The request context, which also contains the user creating the subscription */
  ctx: APIContext;
  /** The document to subscribe to */
  documentId?: string;
  /** Event to subscribe to */
  event: string;
  /** Whether the subscription should be restored if it exists in a deleted state  */
  resubscribe?: boolean;
};

/**
 * This command creates a subscription of a user to a document.
 *
 * @returns The subscription that was created
 */
export default async function subscriptionCreator({
  ctx,
  documentId,
  event,
  resubscribe = true,
}: Props): Promise<Subscription> {
  const { user } = ctx.context.auth;
  const [subscription] = await Subscription.findOrCreateWithCtx(ctx, {
    where: {
      userId: user.id,
      documentId,
      event,
    },
    paranoid: false, // Previous subscriptions are soft-deleted, we want to know about them here.
  });

  // If the subscription was deleted, then just restore the existing row.
  if (subscription.deletedAt && resubscribe) {
    await subscription.restoreWithCtx(ctx);
  }

  return subscription;
}

/**
 * Create any new subscriptions that might be missing for collaborators in the
 * document on publish and revision creation. This does mean that there is a
 * short period of time where the user is not subscribed after editing until a
 * revision is created.
 *
 * @param document The document to create subscriptions for
 * @param event The event that triggered the subscription creation
 */
export const createSubscriptionsForDocument = async (
  document: Document,
  event: DocumentEvent | RevisionEvent
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    const users = await document.collaborators({ transaction });

    for (const user of users) {
      await subscriptionCreator({
        ctx: createContext({
          user,
          authType: event.authType,
          ip: event.ip,
          transaction,
        }),
        documentId: document.id,
        event: "documents.update",
        resubscribe: false,
      });
    }
  });
};
