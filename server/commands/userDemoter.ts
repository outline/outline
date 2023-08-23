import { ValidationError } from "@server/errors";
import { Event, User } from "@server/models";
import type { UserRole } from "@server/models/User";
import CleanupDemotedUserTask from "@server/queues/tasks/CleanupDemotedUserTask";
import { sequelize } from "@server/storage/database";

type Props = {
  user: User;
  actorId: string;
  to: UserRole;
  ip: string;
};

export default async function userDemoter({ user, actorId, to, ip }: Props) {
  if (user.id === actorId) {
    throw ValidationError("Unable to demote the current user");
  }

  return sequelize.transaction(async (transaction) => {
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
  });
}
