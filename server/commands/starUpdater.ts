import { Transaction } from "sequelize";
import { Event, Star, User } from "@server/models";

type Props = {
  /** The user updating the star */
  user: User;
  /** The existing star */
  star: Star;
  /** The index to star the document at */
  index: string;
  /** The IP address of the user creating the star */
  ip: string;
  /** Optional existing transaction */
  transaction?: Transaction;
};

/**
 * This command updates a "starred" document. A star can only be moved to a new
 * index (reordered) once created.
 *
 * @param Props The properties of the star to update
 * @returns Star The updated star
 */
export default async function starUpdater({
  user,
  star,
  index,
  ip,
  transaction,
}: Props): Promise<Star> {
  star.index = index;
  await star.save({ transaction });

  await Event.create(
    {
      name: "stars.update",
      modelId: star.id,
      userId: star.userId,
      teamId: user.teamId,
      actorId: user.id,
      documentId: star.documentId,
      ip,
    },
    { transaction }
  );
  return star;
}
