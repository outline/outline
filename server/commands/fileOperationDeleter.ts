import { FileOperation, Event, User } from "@server/models";
import { sequelize } from "@server/storage/database";

export default async function fileOperationDeleter(
  fileOperation: FileOperation,
  user: User,
  ip: string
) {
  const transaction = await sequelize.transaction();

  try {
    await fileOperation.destroy({
      transaction,
    });
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
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
