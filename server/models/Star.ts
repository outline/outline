import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "stars", modelName: "star" })
@Fix
class Star extends BaseModel {
  @Column
  index: string | null;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;
}

export default Star;
