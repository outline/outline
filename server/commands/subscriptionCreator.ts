import { Transaction } from "sequelize";
import { Subscription, Event, User } from "@server/models";

type Props = {
  /** The user creating the subscription */
  user: User;
  /** The document to subscription */
  documentId?: string;
  /** Status of a subscription */
  enabled: boolean;
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
  // Sane default state when creating a subscription.
  enabled = true,
  ip,
  transaction,
}: Props): Promise<Subscription> {
  // If a subscription already exists, fetch it,
  // otherwise create a subscription and return it.
  // `created` is a boolean value
  // that indicates  whether
  // that subscription was created
  // or already existed.
  const [subscription, created] = await Subscription.findOrCreate({
    where: {
      userId: user.id,
      documentId,
      enabled,
    },
  });

  // Don't emit an event if a new subscription
  // wasn't created.
  //
  // `findOrCreate` is primarily used as an
  // infallible function for valid
  // arguments.
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
