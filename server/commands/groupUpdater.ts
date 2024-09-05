import type { Transaction } from "sequelize";
import { Event, type Group, type User } from "@server/models";

type Props = {
  group: Group;
  name: string;
  actor: User;
  ip: string;
  transaction?: Transaction;
};

export default async function groupUpdater({
  group,
  name,
  actor,
  ip,
  transaction,
}: Props): Promise<Group> {
  group.name = name;

  if (group.changed()) {
    await group.save({ transaction });
    await Event.create(
      {
        name: "groups.update",
        modelId: group.id,
        teamId: actor.teamId,
        actorId: actor.id,
        data: {
          name: group.name,
        },
        ip,
      },
      { transaction }
    );
  }

  return group;
}
