import { Column, ForeignKey, BelongsTo, Table } from "sequelize-typescript";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";

@Table({ tableName: "pins", modelName: "pin" })
class Pin extends BaseModel {
  @Column
  index: string | null;

  // associations

  @BelongsTo(() => User, "userId")
  createdBy: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column
  collectionId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column
  documentId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;
}

export default Pin;
