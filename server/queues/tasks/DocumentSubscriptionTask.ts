import { Transaction } from "sequelize";
import { SubscriptionType } from "@shared/types";
import { createContext } from "@server/context";
import { Subscription, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import { DocumentUserEvent } from "@server/types";
import BaseTask from "./BaseTask";

export default class DocumentSubscriptionTask extends BaseTask<DocumentUserEvent> {
  public async perform(event: DocumentUserEvent) {
    const user = await User.findByPk(event.userId);

    if (!user || event.name !== "documents.remove_user") {
      return;
    }

    await sequelize.transaction(async (transaction) => {
      const subscription = await Subscription.findOne({
        where: {
          userId: user.id,
          documentId: event.documentId,
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
