import { FileOperation, Event, User } from "@server/models";
import { sequelize } from "../sequelize";

export default async function fileOperationDeleter(
  // @ts-expect-error ts-migrate(2749) FIXME: 'FileOperation' refers to a value, but is being us... Remove this comment to see the full error message
  fileOp: FileOperation,
  user: User,
  ip: string
) {
  const transaction = await sequelize.transaction();

  try {
    await fileOp.destroy({
      transaction,
    });
    await Event.create(
      {
        name: "fileOperations.delete",
        teamId: user.teamId,
        actorId: user.id,
        data: fileOp.dataValues,
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
