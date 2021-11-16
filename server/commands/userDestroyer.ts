import { ValidationError } from "../errors";
import { Event, User } from "../models";
import { Op, sequelize } from "../sequelize";

export default async function userDestroyer({
  user,
  actor,
  ip,
}: {
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  user: User;
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  actor: User;
  ip: string;
}) {
  const { teamId } = user;
  const usersCount = await User.count({
    where: {
      teamId,
    },
  });

  if (usersCount === 1) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new ValidationError("Cannot delete last user on the team.");
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
      // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
      throw new ValidationError(
        "Cannot delete account as only admin. Please make another user admin and try again."
      );
    }
  }

  const transaction = await sequelize.transaction();
  let response;

  try {
    response = await user.destroy({
      transaction,
    });
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
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return response;
}
