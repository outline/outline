import type { Transaction } from "sequelize";
import { Event, type Group, type User } from "@server/models";

type Props = {
  group: Group;
  actor: User;
  ip: string;
  transaction?: Transaction;
};

export default async function groupDestroyer({
  group,
  actor,
  ip,
  transaction,
}: Props): Promise<void> {
  await group.destroy({ transaction });
  await Event.create(
    {
      name: "groups.delete",
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
