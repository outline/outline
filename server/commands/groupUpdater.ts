import type { Transaction } from "sequelize";
import { Event, type Group, type User } from "@server/models";

type Props = {
  group: Group;
  name: string | undefined;
  externalId: string | undefined;
  actor: User;
  ip: string;
  transaction?: Transaction;
};

export default async function groupUpdater({
  group,
  name,
  externalId,
  actor,
  ip,
  transaction,
}: Props): Promise<Group> {
  if (name) {
    group.name = name;
  }
  if (externalId) {
    group.externalId = externalId;
  }

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
