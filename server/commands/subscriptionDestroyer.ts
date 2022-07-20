import { Transaction } from "sequelize";
import { Event, Subscription, User } from "@server/models";

type Props = {
  /** The user destroying the subscription */
  user: User;
  /** The subscription to destroy */
  subscription: Subscription;
  /** The IP address of the user creating the subscription */
  ip: string;
  transaction: Transaction;
};

/**
 * This command destroys a document subscription.
 *
 * This just removes the subscription.
 * Does not touch the target document.
 *
 * @param Props The subscription to destroy
 * @returns void
 */
export default async function subscriptionDestroyer({
  user,
  subscription,
  ip,
  transaction,
}: Props): Promise<Subscription> {
  await Event.create(
    {
      name: "subscriptions.delete",
      modelId: subscription.id,
      actorId: user.id,
      userId: user.id,
      documentId: subscription.documentId,
      ip,
    },
    { transaction }
  );

  await subscription.destroy({ transaction });

  return subscription;
}
