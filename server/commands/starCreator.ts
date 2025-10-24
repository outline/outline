import fractionalIndex from "fractional-index";
import { Sequelize, WhereOptions } from "sequelize";
import { Star, User } from "@server/models";
import { APIContext } from "@server/types";

type Props = {
  /** The user creating the star */
  user: User;
  /** The document to star */
  documentId?: string;
  /** The collection to star */
  collectionId?: string;
  /** The parent folder ID */
  parentId?: string;
  /** Whether this star is a folder */
  isFolder?: boolean;
  /** The sorted index for the star in the sidebar If no index is provided then it will be at the end */
  index?: string;
  /** The request context */
  ctx: APIContext;
};

/**
 * This command creates a "starred" document, collection, or folder via the star relation. 
 * Stars are only visible to the user that created them.
 *
 * @param Props The properties of the star to create
 * @returns Star The star that was created
 */
export default async function starCreator({
  user,
  documentId,
  collectionId,
  parentId,
  isFolder,
  ctx,
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
      transaction: ctx.state.transaction,
    });

    // create a star at the beginning of the list
    index = fractionalIndex(null, stars.length ? stars[0].index : null);
  }

  if (isFolder) {
    // For folders, we always create a new star since folders are unique entities
    // and don't have documentId or collectionId to deduplicate on
    const star = await Star.createWithCtx(ctx, {
      userId: user.id,
      parentId: parentId || null,
      isFolder: true,
      documentId: null,
      collectionId: null,
      index,
    });
    return star;
  } else {
    // For regular stars (documents/collections), use findOrCreate to prevent duplicates
    const whereClause = documentId
      ? {
          userId: user.id,
          documentId,
        }
      : {
          userId: user.id,
          collectionId,
        };

    const [star] = await Star.findOrCreateWithCtx(ctx, {
      where: whereClause,
      defaults: {
        index,
        parentId: parentId || null,
        isFolder: false,
      },
    });

    return star;
  }
}
