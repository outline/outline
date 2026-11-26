import { Op } from "sequelize";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import { Document } from "@server/models";
import { BaseTask } from "./base/BaseTask";

type Props = {
  documentIds: string[];
};

export default class EmptyTrashTask extends BaseTask<Props> {
  public async perform({ documentIds }: Props) {
    if (!documentIds.length) {
      return;
    }
    await Document.unscoped().findAllInBatches<Document>(
      {
        where: {
          id: {
            [Op.in]: documentIds,
          },
          // for safety, ensure the documents are in soft-delete state.
          deletedAt: {
            [Op.ne]: null,
          },
        },
        paranoid: false,
        batchLimit: 100,
      },
      async (documents) => {
        if (documents.length) {
          await documentPermanentDeleter(documents);
        }
      }
    );
  }
}
