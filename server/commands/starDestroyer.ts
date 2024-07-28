import { Transaction } from "sequelize";
import { Event, Star, User } from "@server/models";

type Props = {
  /** The user destroying the star */
  user: User;
  /** The star to destroy */
  star: Star;
  /** The IP address of the user creating the star */
  ip: string;
  /** Optional existing transaction */
  transaction?: Transaction;
};

/**
 * This command destroys a document star. This just removes the star itself and
 * does not touch the document
 *
 * @param Props The properties of the star to destroy
 * @returns void
 */
export default async function starDestroyer({
  user,
  star,
  ip,
  transaction,
}: Props): Promise<Star> {
  await star.destroy({ transaction });

  await Event.create(
    {
      name: "stars.delete",
      modelId: star.id,
      teamId: user.teamId,
      actorId: user.id,
      userId: star.userId,
      documentId: star.documentId,
      ip,
    },
    { transaction }
  );
  return star;
}
