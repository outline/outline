import { Op } from "sequelize";
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
    await Document.unscoped().update(
      {
        permanentlyDeletedAt: new Date(),
      },
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
      }
    );
  }
}
