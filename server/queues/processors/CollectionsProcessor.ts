import teamUpdater from "@server/commands/teamUpdater";
import { createContext } from "@server/context";
import { Team, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import { Event as TEvent, CollectionEvent } from "@server/types";
import DetachDraftsFromCollectionTask from "../tasks/DetachDraftsFromCollectionTask";
import BaseProcessor from "./BaseProcessor";

export default class CollectionsProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = [
    "collections.delete",
    "collections.archive",
  ];

  async perform(event: CollectionEvent) {
    await new DetachDraftsFromCollectionTask().schedule({
      collectionId: event.collectionId,
      actorId: event.actorId,
      ip: event.ip,
    });

    await sequelize.transaction(async (transaction) => {
      const team = await Team.findByPk(event.teamId, {
        rejectOnEmpty: true,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (team?.defaultCollectionId === event.collectionId) {
        const user = await User.findByPk(event.actorId, {
          rejectOnEmpty: true,
          paranoid: false,
          transaction,
        });

        const ctx = createContext({
          user,
          transaction,
          ip: event.ip,
        });

        await teamUpdater(ctx, {
          params: { defaultCollectionId: null },
          user,
          team,
        });
      }
    });
  }
}
