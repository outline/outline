import { Transaction } from "sequelize";
import { sequelize } from "@server/database/sequelize";
import { User, Event, GroupUser } from "@server/models";
import CleanupDemotedUserTask from "@server/queues/tasks/CleanupDemotedUserTask";
import { ValidationError } from "../errors";

type Props = {
  user: User;
  actorId: string;
  ip: string;
};

export default async function userSuspender({
  user,
  actorId,
  ip,
}: Props): Promise<void> {
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

    await CleanupDemotedUserTask.schedule({ userId: user.id });
  });
}
