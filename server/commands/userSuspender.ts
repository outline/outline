import { Transaction } from "sequelize";
import { User, Event, GroupUser } from "@server/models";
import { sequelize } from "@server/sequelize";
import { ValidationError } from "../errors";

export default async function userSuspender({
  user,
  actorId,
  ip,
}: {
  user: User;
  actorId: string;
  ip: string;
}): Promise<void> {
  if (user.id === actorId) {
    throw ValidationError("Unable to suspend the current user");
  }

  await sequelize.transaction(async (transaction: Transaction) => {
    await user.update(
      {
        suspendedById: actorId,
        suspendedAt: new Date(),
      },
      {
        transaction,
      }
    );
    await GroupUser.destroy({
      where: {
        userId: user.id,
      },
      transaction,
    });
    await Event.create(
      {
        name: "users.suspend",
        actorId,
        userId: user.id,
        teamId: user.teamId,
        data: {
          name: user.name,
        },
        ip,
      },
      {
        transaction,
      }
    );
  });
}
