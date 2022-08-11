import { Transaction } from "sequelize";
import { Subscription, Event, User } from "@server/models";

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
    subscription.update({ deletedAt: null }, { transaction });

    await Event.create(
      {
        name: "subscriptions.create",
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
