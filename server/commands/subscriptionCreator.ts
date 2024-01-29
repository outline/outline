import { Transaction } from "sequelize";
import { Subscription, Event, User, Document } from "@server/models";
import { sequelize } from "@server/storage/database";
import { DocumentEvent, RevisionEvent } from "@server/types";

type Props = {
  /** The user creating the subscription */
  user: User;
  /** The document to subscribe to */
  documentId?: string;
  /** Event to subscribe to */
  event: string;
  /** The IP address of the incoming request */
  ip: string;
  /** Whether the subscription should be restored if it exists in a deleted state  */
  resubscribe?: boolean;
  transaction: Transaction;
};

/**
 * This command creates a subscription of a user to a document.
 *
 * @returns The subscription that was created
 */
export default async function subscriptionCreator({
  user,
  documentId,
  event,
  ip,
  resubscribe = true,
  transaction,
}: Props): Promise<Subscription> {
  const [subscription, created] = await Subscription.findOrCreate({
    where: {
      userId: user.id,
      documentId,
      event,
    },
    transaction,
    // Previous subscriptions are soft-deleted, we want to know about them here
    paranoid: false,
  });

  // If the subscription was deleted, then just restore the existing row.
  if (subscription.deletedAt && resubscribe) {
    await subscription.restore({ transaction });

    await Event.create(
      {
        name: "subscriptions.create",
        teamId: user.teamId,
        modelId: subscription.id,
        actorId: user.id,
        userId: user.id,
        documentId,
        ip,
      },
      { transaction }
    );
  }

  if (created) {
    await Event.create(
      {
        name: "subscriptions.create",
        teamId: user.teamId,
        modelId: subscription.id,
        actorId: user.id,
        userId: user.id,
        documentId,
        ip,
      },
      { transaction }
    );
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
        user,
        documentId: document.id,
        event: "documents.update",
        resubscribe: false,
        transaction,
        ip: event.ip,
      });
    }
  });
};
