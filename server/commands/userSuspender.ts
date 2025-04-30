import { Transaction } from "sequelize";
import { User, Event, GroupUser } from "@server/models";
import CleanupDemotedUserTask from "@server/queues/tasks/CleanupDemotedUserTask";
import { ValidationError } from "../errors";

type Props = {
  user: User;
  actorId: string;
  transaction?: Transaction;
  ip: string;
};

/**
 * This command suspends an active user, this will cause them to lose access to
 * the team.
 */
export default async function userSuspender({
  user,
  actorId,
  transaction,
  ip,
}: Props): Promise<void> {
  if (user.id === actorId) {
    throw ValidationError("Unable to suspend the current user");
  }

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
    individualHooks: true,
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

  await new CleanupDemotedUserTask().schedule({ userId: user.id });
}
