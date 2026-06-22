import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  AllowNull,
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

  @BelongsTo(() => User, "createdById")
  createdBy?: User | null;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string | null;
}

export default CollectionMaintainer;
