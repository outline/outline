import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  DataType,
  Column,
  ForeignKey,
  BelongsTo,
  Table,
  Length,
} from "sequelize-typescript";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "pins", modelName: "pin" })
@Fix
class Pin extends IdModel<
  InferAttributes<Pin>,
  Partial<InferCreationAttributes<Pin>>
> {
  static eventNamespace = "pins";

  @Length({
    max: 256,
    msg: `index must be 256 characters or less`,
  })
  @Column
  index: string | null;

  // associations

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default Pin;
