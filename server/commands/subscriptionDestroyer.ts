import { Transaction } from "sequelize";
import { Event, Subscription, User } from "@server/models";

type Props = {
  /** The user destroying the subscription */
  user: User;
  /** The subscription to destroy */
  subscription: Subscription;
  /** The IP address of the incoming request */
  ip: string;
  transaction: Transaction;
};

/**
 * This command destroys a user subscription to a document so they will no
 * longer receive notifications.
 *
 * @returns The subscription that was destroyed
 */
export default async function subscriptionDestroyer({
  user,
  subscription,
  ip,
  transaction,
}: Props): Promise<Subscription> {
  await subscription.destroy({ transaction });

  await Event.create(
    {
      name: "subscriptions.delete",
      teamId: user.teamId,
      modelId: subscription.id,
      actorId: user.id,
      userId: user.id,
      documentId: subscription.documentId,
      ip,
    },
    { transaction }
  );

  return subscription;
}
