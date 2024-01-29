import fractionalIndex from "fractional-index";
import { Sequelize, Transaction, WhereOptions } from "sequelize";
import { Star, User, Event } from "@server/models";

type Props = {
  /** The user creating the star */
  user: User;
  /** The document to star */
  documentId?: string;
  /** The collection to star */
  collectionId?: string;
  /** The sorted index for the star in the sidebar If no index is provided then it will be at the end */
  index?: string;
  /** The IP address of the user creating the star */
  ip: string;
  transaction: Transaction;
};

/**
 * This command creates a "starred" document via the star relation. Stars are
 * only visible to the user that created them.
 *
 * @param Props The properties of the star to create
 * @returns Star The star that was created
 */
export default async function starCreator({
  user,
  documentId,
  collectionId,
  ip,
  transaction,
  ...rest
}: Props): Promise<Star> {
  let { index } = rest;
  const where: WhereOptions<Star> = {
    userId: user.id,
  };

  if (!index) {
    const stars = await Star.findAll({
      where,
      attributes: ["id", "index", "updatedAt"],
      limit: 1,
      order: [
        // using LC_COLLATE:"C" because we need byte order to drive the sorting
        // find only the first star so we can create an index before it
        Sequelize.literal('"star"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
      transaction,
    });

    // create a star at the beginning of the list
    index = fractionalIndex(null, stars.length ? stars[0].index : null);
  }

  const [star, isCreated] = await Star.findOrCreate({
    where: documentId
      ? {
          userId: user.id,
          documentId,
        }
      : {
          userId: user.id,
          collectionId,
        },
    defaults: {
      index,
    },
    transaction,
  });

  if (isCreated) {
    await Event.create(
      {
        name: "stars.create",
        teamId: user.teamId,
        modelId: star.id,
        userId: user.id,
        actorId: user.id,
        documentId,
        collectionId,
        ip,
      },
      { transaction }
    );
  }

  return star;
}
