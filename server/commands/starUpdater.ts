import { Event, Star, User } from "@server/models";
import { sequelize } from "@server/storage/database";

type Props = {
  /** The user updating the star */
  user: User;
  /** The existing star */
  star: Star;
  /** The index to star the document at */
  index: string;
  /** The IP address of the user creating the star */
  ip: string;
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
}: Props): Promise<Star> {
  const transaction = await sequelize.transaction();

  try {
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
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return star;
}
