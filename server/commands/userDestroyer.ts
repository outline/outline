import { Op, Transaction } from "sequelize";
import { Event, User } from "@server/models";
import { ValidationError } from "../errors";

export default async function userDestroyer({
  user,
  actor,
  ip,
  transaction,
}: {
  user: User;
  actor: User;
  ip: string;
  transaction?: Transaction;
}) {
  const { teamId } = user;
  const usersCount = await User.count({
    where: {
      teamId,
    },
  });

  if (usersCount === 1) {
    throw ValidationError(
      "Cannot delete last user on the team, delete the workspace instead."
    );
  }

  if (user.isAdmin) {
    const otherAdminsCount = await User.count({
      where: {
        isAdmin: true,
        teamId,
        id: {
          [Op.ne]: user.id,
        },
      },
    });

    if (otherAdminsCount === 0) {
      throw ValidationError(
        "Cannot delete account as only admin. Please make another user admin and try again."
      );
    }
  }

  await Event.create(
    {
      name: "users.delete",
      actorId: actor.id,
      userId: user.id,
      teamId,
      data: {
        name: user.name,
      },
      ip,
    },
    {
      transaction,
    }
  );

  return user.destroy({
    transaction,
  });
}
