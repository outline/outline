import subscriptionCreator from "@server/commands/subscriptionCreator";
import { createContext } from "@server/context";
import { User } from "@server/models";
import { sequelize } from "@server/storage/database";
import { DocumentUserEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class DocumentUserAddedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["documents.add_user"];

  async perform(event: DocumentUserEvent) {
    const user = await User.findByPk(event.userId);
    if (!user) {
      return;
    }

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
}
