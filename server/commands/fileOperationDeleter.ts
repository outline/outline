import { Transaction } from "sequelize";
import { FileOperation, Event, User } from "@server/models";

type Props = {
  fileOperation: FileOperation;
  user: User;
  ip: string;
  transaction: Transaction;
};

export default async function fileOperationDeleter({
  fileOperation,
  user,
  ip,
  transaction,
}: Props) {
  await fileOperation.destroy({ transaction });
  await Event.create(
    {
      name: "fileOperations.delete",
      teamId: user.teamId,
      actorId: user.id,
      modelId: fileOperation.id,
      ip,
    },
    {
      transaction,
    }
  );
}
