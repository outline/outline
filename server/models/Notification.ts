import {
  Table,
  ForeignKey,
  Model,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  BelongsTo,
} from "sequelize-typescript";
import User from "./User";

@Table({ tableName: "notifications", modelName: "notification" })
class Notification extends Model {
  @IsUUID(4)
  @Column
  @PrimaryKey
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
  @Column
  userId: string;

  @BelongsTo(() => User, "actorId")
  actor: User;

  @ForeignKey(() => User)
  @Column
  actorId: string;
}

export default Notification;
