// @flow
import { ValidationError } from "../errors";
import { User, Event, GroupUser } from "../models";
import { sequelize } from "../sequelize";

export default async function userSuspender({
  user,
  actorId,
  ip,
}: {
  user: User,
  actorId: string,
  ip: string,
}): Promise<void> {
  if (user.id === actorId) {
    throw new ValidationError("Unable to suspend the current user");
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();

    await user.update({
      suspendedById: actorId,
      suspendedAt: new Date(),
    });

    await GroupUser.destroy({ where: { userId: user.id } });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }

  await Event.create({
    name: "users.suspend",
    actorId,
    userId: user.id,
    teamId: user.teamId,
    data: { name: user.name },
    ip,
  });
}
