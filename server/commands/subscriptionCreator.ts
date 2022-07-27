import { Transaction } from "sequelize";
import { Subscription, Event, User } from "@server/models";

type Props = {
  /** The user creating the subscription */
  user: User;
  /** The document to subscribe to */
  documentId?: string;
  /** Event to subscribe */
  event: string;
  /** The IP address of the user creating the subscription */
  ip: string;
  transaction: Transaction;
};

/**
 * This command creates a "subscription" on
 * a document via the subscription relation.
 *
 * @param Props The properties of the subscription to create
 * @returns Subscription The subscription that was created
 */
export default async function subscriptionCreator({
  user,
  documentId,
  event,
  ip,
  transaction,
}: Props): Promise<Subscription> {
  const [subscription, created] = await Subscription.findOrCreate({
    where: {
      userId: user.id,
      documentId,
      event,
    },
    paranoid: false,
  });

  // Fetched an already deleted subscription.
  if (subscription.deletedAt) {
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
