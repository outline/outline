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
} from "sequelize-typescript";
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

  @CreatedAt
  createdAt: Date;

  @Column
  event: string;

  @Column
  email: boolean;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "actorId")
  actor: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  actorId: string;
}

export default Notification;
