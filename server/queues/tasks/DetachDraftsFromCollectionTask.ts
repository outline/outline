import { Op } from "sequelize";
import documentMover from "@server/commands/documentMover";
import { sequelize } from "@server/database/sequelize";
import { Collection, Document, User } from "@server/models";
import BaseTask from "./BaseTask";

type Task = {
  collectionId: string;
  actorId: string;
  ip: string;
};

export default class DetachDraftsFromCollectionTask extends BaseTask<Task> {
  async perform(task: Task) {
    const [collection, actor] = await Promise.all([
      Collection.findByPk(task.collectionId, {
        paranoid: false,
      }),
      User.findByPk(task.actorId),
    ]);

    if (!actor || !collection || !collection.deletedAt) {
      return;
    }

    const documents = await Document.findAll({
      where: {
        collectionId: task.collectionId,
        publishedAt: {
          [Op.is]: null,
        },
      },
      paranoid: false,
    });

    return sequelize.transaction(async (transaction) => {
      for (const document of documents) {
        await documentMover({
          document,
          user: actor,
          ip: task.ip,
          collectionId: null,
          transaction,
        });
      }
    });
  }
}
