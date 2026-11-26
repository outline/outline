import { subscribeUserToCollection } from "@server/commands/subscriptionCreator";
import { Collection, User } from "@server/models";
import { can } from "@server/policies";
import type { CollectionOwnerEvent } from "@server/types";
import { BaseTask } from "./base/BaseTask";

/**
 * Subscribes a user to the documents in a collection when they are made an
 * owner of it.
 */
export default class CollectionSubscriptionAddOwnerTask extends BaseTask<CollectionOwnerEvent> {
  public async perform(event: CollectionOwnerEvent) {
    const user = await User.findByPk(event.userId);
    if (!user || user.isSuspended) {
      return;
    }

    const collection = await Collection.findByPk(event.collectionId, {
      userId: user.id,
    });
    if (
      !collection?.ownerIds?.includes(user.id) ||
      !can(user, "read", collection)
    ) {
      return;
    }

    await subscribeUserToCollection(user, collection, event);
  }
}
