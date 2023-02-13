import {
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
  AllowNull,
} from "sequelize-typescript";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "mentions", modelName: "mention" })
@Fix
class Mention extends IdModel {
  @BelongsTo(() => User, "userId")
  user: User | null | undefined;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string | null | undefined;

  @BelongsTo(() => User, "mentionUserId")
  mentionedUser: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  mentionUserId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;
}

export default Mention;
