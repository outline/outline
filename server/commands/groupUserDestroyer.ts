import type { Transaction } from "sequelize";
import { Event, GroupUser, type Group, type User } from "@server/models";

type Props = {
  group: Group;
  user: User;
  actor: User;
  ip: string;
  transaction?: Transaction;
};

export default async function groupUserDestroyer({
  group,
  user,
  actor,
  ip,
  transaction,
}: Props): Promise<void> {
  const groupUser = await GroupUser.unscoped().findOne({
    where: {
      groupId: group.id,
      userId: user.id,
    },
    transaction,
    lock: transaction?.LOCK.UPDATE,
  });

  if (groupUser) {
    await groupUser.destroy({ transaction });
    await Event.create(
      {
        name: "groups.remove_user",
        userId: user.id,
        modelId: group.id,
        teamId: user.teamId,
        actorId: actor.id,
        data: {
          name: user.name,
        },
        ip,
      },
      { transaction }
    );
  }
}
