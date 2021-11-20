import { Transaction } from "sequelize";
import { User, Event, GroupUser } from "@server/models";
import { ValidationError } from "../errors";
import { sequelize } from "../sequelize";

export default async function userSuspender({
  user,
  actorId,
  ip,
}: {
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  user: User;
  actorId: string;
  ip: string;
}): Promise<void> {
  if (user.id === actorId) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new ValidationError("Unable to suspend the current user");
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
