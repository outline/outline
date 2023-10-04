import { Transaction } from "sequelize";
import { UserRole } from "@shared/types";
import { ValidationError } from "@server/errors";
import { Event, User } from "@server/models";
import CleanupDemotedUserTask from "@server/queues/tasks/CleanupDemotedUserTask";

type Props = {
  user: User;
  actorId: string;
  to: UserRole;
  transaction?: Transaction;
  ip: string;
};

export default async function userDemoter({
  user,
  actorId,
  to,
  transaction,
  ip,
}: Props) {
  if (user.id === actorId) {
    throw ValidationError("Unable to demote the current user");
  }

  await user.demote(to, { transaction });
  await Event.create(
    {
      name: "users.demote",
      actorId,
      userId: user.id,
      teamId: user.teamId,
      data: {
        name: user.name,
      },
      ip,
    },
    { transaction }
  );
  await CleanupDemotedUserTask.schedule({ userId: user.id });
}
