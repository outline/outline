import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
} from "sequelize-typescript";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "backlinks", modelName: "backlink" })
@Fix
class Backlink extends IdModel<
  InferAttributes<Backlink>,
  Partial<InferCreationAttributes<Backlink>>
> {
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

  @BelongsTo(() => Document, "reverseDocumentId")
  reverseDocument: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  reverseDocumentId: string;
}

export default Backlink;
