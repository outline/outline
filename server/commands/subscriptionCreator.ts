import { QueryTypes } from "sequelize";
import { SubscriptionType } from "@shared/types";
import { createContext } from "@server/context";
import type { Document } from "@server/models";
import { Subscription, Event } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { APIContext, DocumentEvent, RevisionEvent } from "@server/types";

type Props = {
  /** The request context, which also contains the user creating the subscription */
  ctx: APIContext;
  /** The document to subscribe to */
  documentId?: string;
  /** The collection to subscribe to */
  collectionId?: string;
  /** Event to subscribe to */
  event: SubscriptionType;
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
  collectionId,
  event,
  resubscribe = true,
}: Props): Promise<Subscription> {
  const { user } = ctx.state.auth;

  let rows;
  const now = new Date();
  if (documentId) {
    rows = await sequelize.query(
      `INSERT INTO subscriptions ("id", "userId", "documentId", "event", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), :userId, :documentId, :event, :now, :now)
       ON CONFLICT ("userId", "documentId", "event")
       DO UPDATE SET "updatedAt" = EXCLUDED."updatedAt"
       RETURNING *`,
      {
        replacements: {
          userId: user.id,
          documentId,
          event,
          now,
        },
        type: QueryTypes.SELECT,
        transaction: ctx.state.transaction,
      }
    );
  } else if (collectionId) {
    rows = await sequelize.query(
      `INSERT INTO subscriptions ("id", "userId", "collectionId", "event", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), :userId, :collectionId, :event, :now, :now)
       ON CONFLICT ("userId", "collectionId", "event")
       DO UPDATE SET "updatedAt" = EXCLUDED."updatedAt"
       RETURNING *`,
      {
        replacements: {
          userId: user.id,
          collectionId,
          event,
          now,
        },
        type: QueryTypes.SELECT,
        transaction: ctx.state.transaction,
      }
    );
  } else {
    throw new Error("Either documentId or collectionId must be provided");
  }

  if (!rows || rows.length === 0) {
    throw new Error("Failed to create or find subscription");
  }

  // Build subscription instance from the returned row
  const subscription = Subscription.build(rows[0], {
    isNewRecord: false,
    include: [],
    raw: true,
  });

  const isNew = subscription.createdAt.getTime() === now.getTime();
  if (isNew) {
    await Event.createFromContext(ctx, {
      name: "subscriptions.create",
      modelId: subscription.id,
      userId: subscription.userId,
      collectionId: subscription.collectionId,
      documentId: subscription.documentId,
    });
  }

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
        event: SubscriptionType.Document,
        resubscribe: false,
      });
    }
  });
};
