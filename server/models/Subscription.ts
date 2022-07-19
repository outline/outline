import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "subscriptions", modelName: "subscription" })
@Fix
class Subscription extends IdModel {
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

  @Column
  enabled: boolean;
}

export default Subscription;
