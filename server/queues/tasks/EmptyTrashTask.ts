import { Op } from "sequelize";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import { Document } from "@server/models";
import BaseTask from "./BaseTask";

type Props = {
  documentIds: string[];
};

export default class EmptyTrashTask extends BaseTask<Props> {
  public async perform({ documentIds }: Props) {
    if (!documentIds.length) {
      return;
    }
    const documents = await Document.unscoped().findAll({
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
    });
    await documentPermanentDeleter(documents);
  }
}
