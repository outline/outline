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
        destroyedAt: new Date(),
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
          // documents already pending permanent deletion keep their original
          // timestamp, so emptying the trash cannot extend their retention.
          destroyedAt: {
            [Op.is]: null,
          },
        },
        paranoid: false,
      }
    );
  }
}
