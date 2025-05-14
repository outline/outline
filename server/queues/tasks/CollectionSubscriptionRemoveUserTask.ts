import { Transaction } from "sequelize";
import { SubscriptionType } from "@shared/types";
import { createContext } from "@server/context";
import Logger from "@server/logging/Logger";
import { Collection, Subscription, User } from "@server/models";
import { can } from "@server/policies";
import { sequelize } from "@server/storage/database";
import { CollectionUserEvent } from "@server/types";
import BaseTask from "./BaseTask";

export default class CollectionSubscriptionRemoveUserTask extends BaseTask<CollectionUserEvent> {
  public async perform(event: CollectionUserEvent) {
    const user = await User.findByPk(event.userId);

    if (!user) {
      return;
    }

    const collection = await Collection.findByPk(event.collectionId, {
      userId: user.id,
    });

    if (can(user, "read", collection)) {
      Logger.debug(
        "task",
        `Skip unsubscribing user ${user.id} as they have permission to the collection ${event.collectionId} through other means`
      );
      return;
    }

    await sequelize.transaction(async (transaction) => {
      const subscription = await Subscription.findOne({
        where: {
          userId: user.id,
          collectionId: event.collectionId,
          event: SubscriptionType.Document,
        },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      await subscription?.destroyWithCtx(
        createContext({
          user,
          authType: event.authType,
          ip: event.ip,
          transaction,
        })
      );
    });
  }
}
