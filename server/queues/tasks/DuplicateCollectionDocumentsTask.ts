import { Op } from "sequelize";
import { documentsDuplicator } from "@server/commands/documentDuplicator";
import { createContext } from "@server/context";
import { Collection, Document, User } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { sequelize } from "@server/storage/database";
import { BaseTask } from "./base/BaseTask";

type Props = {
  /** The collection to duplicate documents into */
  collectionId: string;
  /** The collection to duplicate documents from */
  originalCollectionId: string;
  /** The user that initiated the duplication */
  actorId: string;
  /** The IP address of the user that initiated the duplication */
  ip: string | null;
};

export default class DuplicateCollectionDocumentsTask extends BaseTask<Props> {
  async perform(props: Props) {
    const [collection, original, actor] = await Promise.all([
      Collection.findByPk(props.collectionId),
      Collection.findByPk(props.originalCollectionId),
      User.findByPk(props.actorId),
    ]);

    if (!actor || !original || !collection?.isActive) {
      return;
    }

    const rootDocuments = await Document.findAll({
      where: {
        teamId: original.teamId,
        collectionId: original.id,
        parentDocumentId: {
          [Op.is]: null,
        },
        archivedAt: {
          [Op.is]: null,
        },
      },
    });

    if (!rootDocuments.length) {
      return;
    }

    const structure = await original.getCachedDocumentStructure();
    const sorted = DocumentHelper.sortDocumentsByStructure(
      rootDocuments,
      structure ?? []
    ).reverse(); // we have to reverse since the root documents will be added in reverse order

    return sequelize.transaction(async (transaction) => {
      const ctx = createContext({
        user: actor,
        ip: props.ip,
        transaction,
      });

      // The whole collection is duplicated as one unit so that links between
      // documents in different trees are remapped to the copies.
      await documentsDuplicator(ctx, {
        documents: sorted,
        collection,
        recursive: true,
      });
    });
  }
}
