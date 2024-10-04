import type { Transaction } from "sequelize";
import { Event, GroupUser, type Group, type User } from "@server/models";

type Props = {
  group: Group;
  user: User;
  actor: User;
  ip: string;
  transaction?: Transaction;
};

export default async function groupUserCreator({
  group,
  user,
  actor,
  ip,
  transaction,
}: Props): Promise<GroupUser> {
  let groupUser = await GroupUser.findOne({
    where: {
      groupId: group.id,
      userId: user.id,
    },
    transaction,
  });

  if (!groupUser) {
    groupUser = await GroupUser.create(
      {
        groupId: group.id,
        userId: user.id,
        createdById: actor.id,
      },
      { transaction }
    );
    groupUser.user = user;

    await Event.create(
      {
        name: "groups.add_user",
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

  return groupUser;
}
