import { Transaction } from "sequelize";
import { Subscription, Event } from "@server/models";

type Props = {
  /** The user updateing the subscription */
  userId: string;
  /** The existing subscription */
  subscription: Subscription;
  /** Status of a subscription */
  enabled: boolean;
  /** The IP address of the user updateing the subscription */
  ip: string;
  transaction: Transaction;
};

/**
 * This command updates a "subscription" on
 * a document via the subscription relation.
 *
 * @param Props The properties of the subscription to update
 * @returns Subscription The subscription that was updated
 */
export default async function subscriptionUpdater({
  userId,
  // `userId` + `subscription` should be enough infomation.
  subscription,
  enabled,
  ip,
  transaction,
}: Props): Promise<Subscription> {
  // An existing subscription can be toggled.
  subscription.enabled = enabled;

  const changed = subscription.changed();

  // Don't emit an event if a subscription
  // wasn't updated.
  if (changed) {
    await Event.create(
      {
        name: "subscriptions.update",
        modelId: subscription.id,
        actorId: userId,
        userId,
        documentId: subscription.documentId,
        enabled,
        ip,
      },
      { transaction }
    );
  }

  return subscription;
}
