import { Op } from "sequelize";
import { Collection, Document } from "@server/models";
import BaseTask from "./BaseTask";

type Task = {
  collectionId: string;
};

export default class DetachDraftsFromCollectionTask extends BaseTask<Task> {
  async perform(task: Task) {
    const collection = await Collection.findByPk(task.collectionId, {
      paranoid: false,
    });

    if (!collection || !collection.deletedAt) {
      return;
    }

    await Document.update(
      { collectionId: null },
      {
        where: {
          collectionId: task.collectionId,
          publishedAt: {
            [Op.is]: null,
          },
        },
        paranoid: false,
      }
    );
  }
}
