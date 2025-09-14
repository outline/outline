import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  Length,
  HasMany,
} from "sequelize-typescript";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "stars", modelName: "star" })
@Fix
class Star extends IdModel<
  InferAttributes<Star>,
  Partial<InferCreationAttributes<Star>>
> {
  @Length({
    max: 256,
    msg: `index must be 256 characters or less`,
  })
  @Column
  index: string | null;

  @Column(DataType.BOOLEAN)
  isFolder: boolean;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string | null;

  @BelongsTo(() => Star, "parentId")
  parent: Star | null;

  @ForeignKey(() => Star)
  @Column(DataType.UUID)
  parentId: string | null;

  @HasMany(() => Star, "parentId")
  children: Star[];
}

export default Star;
