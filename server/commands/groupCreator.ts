import type { Transaction } from "sequelize";
import { Event, Group, type User } from "@server/models";

type Props = {
  name: string;
  externalId: string | undefined;
  actor: User;
  ip: string;
  transaction?: Transaction;
};

export default async function groupCreator({
  name,
  externalId,
  actor,
  ip,
  transaction,
}: Props): Promise<Group> {
  const group = await Group.create(
    {
      name,
      externalId,
      teamId: actor.teamId,
      createdById: actor.id,
    },
    { transaction }
  );
  await Event.create(
    {
      name: "groups.create",
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
  return group;
}
