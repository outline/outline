import { FileOperationState, FileOperationType } from "@shared/types";
import collectionDestroyer from "@server/commands/collectionDestroyer";
import Logger from "@server/logging/Logger";
import { Collection, FileOperation, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import { Event as TEvent, FileOperationEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class FileOperationDeletedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = [
    "fileOperations.delete",
    "fileOperations.update",
  ];

  async perform(event: FileOperationEvent) {
    await sequelize.transaction(async (transaction) => {
      const fileOperation = await FileOperation.findByPk(event.modelId, {
        rejectOnEmpty: true,
        paranoid: false,
        transaction,
      });
      if (fileOperation.type === FileOperationType.Export) {
        return;
      }

      if (
        event.name === "fileOperations.update" &&
        fileOperation.state !== FileOperationState.Error
      ) {
        return;
      }

      if (
        event.name === "fileOperations.delete" &&
        ![FileOperationState.Complete, FileOperationState.Error].includes(
          fileOperation.state
        )
      ) {
        return;
      }

      const user = await User.findByPk(event.actorId, {
        rejectOnEmpty: true,
        paranoid: false,
        transaction,
      });

      const collections = await Collection.findAll({
        transaction,
        lock: transaction.LOCK.UPDATE,
        where: {
          teamId: fileOperation.teamId,
          importId: fileOperation.id,
        },
      });

      for (const collection of collections) {
        Logger.debug("processor", "Destroying collection created from import", {
          collectionId: collection.id,
        });
        await collectionDestroyer({
          collection,
          transaction,
          user,
          ip: event.ip,
        });
      }
    });
  }
}
