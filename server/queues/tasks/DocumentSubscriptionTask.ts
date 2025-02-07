import { Transaction } from "sequelize";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { createContext } from "@server/context";
import { Subscription, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import { DocumentUserEvent } from "@server/types";
import BaseTask from "./BaseTask";

export default class DocumentSubscriptionTask extends BaseTask<DocumentUserEvent> {
  public async perform(event: DocumentUserEvent) {
    const user = await User.findByPk(event.userId);
    if (!user) {
      return;
    }

    switch (event.name) {
      case "documents.add_user":
        return this.addUser(event, user);

      case "documents.remove_user":
        return this.removeUser(event, user);

      default:
    }
  }

  private async addUser(event: DocumentUserEvent, user: User) {
    await sequelize.transaction(async (transaction) => {
      await subscriptionCreator({
        ctx: createContext({
          user,
          authType: event.authType,
          ip: event.ip,
          transaction,
        }),
        documentId: event.documentId,
        event: "documents.update",
        resubscribe: false,
      });
    });
  }

  private async removeUser(event: DocumentUserEvent, user: User) {
    await sequelize.transaction(async (transaction) => {
      const subscription = await Subscription.findOne({
        where: {
          userId: user.id,
          documentId: event.documentId,
          event: "documents.update",
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
