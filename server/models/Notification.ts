import {
  Table,
  ForeignKey,
  Model,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  BelongsTo,
  DataType,
  Default,
  AllowNull,
} from "sequelize-typescript";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";

@Table({
  tableName: "notifications",
  modelName: "notification",
  updatedAt: false,
})
@Fix
class Notification extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @AllowNull
  @Column
  emailedAt: Date;

  @AllowNull
  @Column
  viewedAt: Date;

  @CreatedAt
  createdAt: Date;

  @Column
  event: string;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "actorId")
  actor: User;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  actorId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @AllowNull
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default Notification;
