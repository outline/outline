import { Op } from "sequelize";
import { UserRole } from "@shared/types";
import { Event, User } from "@server/models";
import { APIContext } from "@server/types";
import { ValidationError } from "../errors";

export default async function userDestroyer(
  ctx: APIContext,
  {
    user,
  }: {
    user: User;
  }
) {
  const { transaction } = ctx.state;
  const { teamId } = user;
  const usersCount = await User.count({
    where: {
      teamId,
    },
    transaction,
  });

  if (usersCount === 1) {
    throw ValidationError(
      "Cannot delete last user on the team, delete the workspace instead."
    );
  }

  if (user.isAdmin) {
    const otherAdminsCount = await User.count({
      where: {
        role: UserRole.Admin,
        teamId,
        id: {
          [Op.ne]: user.id,
        },
      },
      transaction,
    });

    if (otherAdminsCount === 0) {
      throw ValidationError(
        "Cannot delete account as only admin. Please make another user admin and try again."
      );
    }
  }

  await Event.createFromContext(ctx, {
    name: "users.delete",
    userId: user.id,
    data: {
      name: user.name,
    },
  });

  return user.destroy({
    transaction,
  });
}
