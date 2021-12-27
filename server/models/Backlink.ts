import { BelongsTo, ForeignKey, Column, Table } from "sequelize-typescript";
import Document from "./Document";
import User from "./User";
import BaseModel from "./base/BaseModel";

@Table({ tableName: "backlinks", modelName: "backlink" })
class Backlink extends BaseModel {
  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column
  documentId: string;

  @BelongsTo(() => Document, "reverseDocumentId")
  reverseDocument: Document;

  @ForeignKey(() => Document)
  @Column
  reverseDocumentId: string;
}

export default Backlink;
