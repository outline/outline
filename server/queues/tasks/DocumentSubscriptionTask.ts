import { Transaction } from "sequelize";
import { SubscriptionType } from "@shared/types";
import { createContext } from "@server/context";
import Logger from "@server/logging/Logger";
import { Document, Subscription, User } from "@server/models";
import { can } from "@server/policies";
import { sequelize } from "@server/storage/database";
import { DocumentUserEvent } from "@server/types";
import BaseTask from "./BaseTask";

export default class DocumentSubscriptionTask extends BaseTask<DocumentUserEvent> {
  public async perform(event: DocumentUserEvent) {
    const user = await User.findByPk(event.userId);

    if (!user || event.name !== "documents.remove_user") {
      return;
    }

    const document = await Document.findByPk(event.documentId, {
      userId: user.id,
    });

    if (can(user, "read", document)) {
      Logger.debug(
        "task",
        `Skip unsubscribing user ${user.id} as they have permission to the document ${event.documentId} through other means`
      );
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
