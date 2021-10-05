// @flow
import { FileOperation, Event, User } from "../models";
import { sequelize } from "../sequelize";

export default async function fileOperationDeleter(
  fileOp: FileOperation,
  user: User
) {
  let transaction = await sequelize.transaction();

  try {
    await fileOp.destroy({ transaction });

    await Event.create(
      {
        name: "fileOperations.delete",
        teamId: user.teamId,
        actorId: user.id,
        data: fileOp.dataValues,
      },
      { transaction }
    );

    await transaction.commit();
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
}
