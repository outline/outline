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
} from "sequelize-typescript";
import User from "./User";

@Table({
  tableName: "notifications",
  modelName: "notification",
  updatedAt: false,
})
class Notification extends Model {
  @IsUUID(4)
  @PrimaryKey
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
