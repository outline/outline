import type { InferAttributes, InferCreationAttributes, Transaction } from "sequelize";
import { Op } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Collection from "./Collection";
import User from "./User";
import Fix from "./decorators/Fix";
import IdModel from "./base/IdModel";

/**
 * Represents a user designated as a maintainer for a collection who can
 * approve or reject change requests.
 */
@Table({ tableName: "collection_maintainers", modelName: "collection_maintainer" })
@Fix
class CollectionMaintainer extends IdModel<
  InferAttributes<CollectionMaintainer>,
  Partial<InferCreationAttributes<CollectionMaintainer>>
> {
  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  /**
   * Load maintainer user ids for multiple collections in a single query.
   *
   * @param collectionIds Collection ids to load maintainers for.
   * @param options Optional query options.
   * @return Map of collection id to maintainer user ids.
   */
  static async maintainerIdsByCollectionIds(
    collectionIds: string[],
    options: { transaction?: Transaction } = {}
  ): Promise<Map<string, string[]>> {
    if (!collectionIds.length) {
      return new Map();
    }

    const maintainers = await this.findAll({
      attributes: ["collectionId", "userId"],
      where: {
        collectionId: {
          [Op.in]: collectionIds,
        },
      },
      transaction: options.transaction,
    });

    const maintainerIdsByCollectionId = new Map<string, string[]>();

    for (const maintainer of maintainers) {
      const existing = maintainerIdsByCollectionId.get(maintainer.collectionId);
      if (existing) {
        existing.push(maintainer.userId);
      } else {
        maintainerIdsByCollectionId.set(maintainer.collectionId, [
          maintainer.userId,
        ]);
      }
    }

    return maintainerIdsByCollectionId;
  }
}

export default CollectionMaintainer;
