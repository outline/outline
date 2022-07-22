import assert from "assert";
import { Transaction } from "sequelize";
import { Subscription, Event, User } from "@server/models";

type Props = {
  /** The user updateing the subscription */
  user: User;
  /** The existing subscription */
  subscription: Subscription;
  /** Event to subscribe */
  event: string;
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
  user,
  // `userId` + `subscription` should be enough infomation.
  subscription,
  event,
  enabled,
  ip,
  transaction,
}: Props): Promise<Subscription> {
  // Subscription shouldn't be allowed to move.
  // REVIEW: Is this alright?
  assert(event === subscription.event);

  assert(subscription.userId === user.id);

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
        actorId: user.id,
        userId: user.id,
        documentId: subscription.documentId,
        enabled,
        ip,
      },
      { transaction }
    );
  }

  return subscription;
}
