import { Transaction } from "sequelize";
import { Event, User, Team } from "@server/models";

export default async function teamDestroyer({
  user,
  team,
  ip,
  transaction,
}: {
  user: User;
  team: Team;
  ip: string;
  transaction?: Transaction;
}) {
  await Event.create(
    {
      name: "teams.delete",
      actorId: user.id,
      teamId: team.id,
      data: {
        name: team.name,
      },
      ip,
    },
    {
      transaction,
    }
  );

  return team.destroy({
    transaction,
  });
}
