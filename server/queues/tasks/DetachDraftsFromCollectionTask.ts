import { Op } from "sequelize";
import documentMover from "@server/commands/documentMover";
import { Collection, Document, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import BaseTask from "./BaseTask";

type Props = {
  collectionId: string;
  actorId: string;
  ip: string | null;
};

export default class DetachDraftsFromCollectionTask extends BaseTask<Props> {
  async perform(props: Props) {
    const [collection, actor] = await Promise.all([
      Collection.findByPk(props.collectionId, {
        paranoid: false,
      }),
      User.findByPk(props.actorId),
    ]);

    if (
      !actor ||
      !collection ||
      !(collection.deletedAt || collection.archivedAt)
    ) {
      return;
    }

    const documents = await Document.scope("withDrafts").findAll({
      where: {
        collectionId: props.collectionId,
        template: false,
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
          ip: props.ip,
          collectionId: null,
          transaction,
        });
      }
    });
  }
}
