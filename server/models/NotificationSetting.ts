import crypto from "crypto";
import {
  Table,
  ForeignKey,
  Model,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  BelongsTo,
  IsIn,
  DataType,
} from "sequelize-typescript";
import Team from "./Team";
import User from "./User";

@Table({
  tableName: "notification_settings",
  modelName: "notification_setting",
  updatedAt: false,
})
class NotificationSetting extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @CreatedAt
  createdAt: Date;

  @IsIn([
    [
      "documents.publish",
      "documents.update",
      "collections.create",
      "emails.onboarding",
      "emails.features",
    ],
  ])
  @Column(DataType.STRING)
  event: string;

  // getters

  get unsubscribeUrl() {
    const token = NotificationSetting.getUnsubscribeToken(this.userId);
    return `${process.env.URL}/api/notificationSettings.unsubscribe?token=${token}&id=${this.id}`;
  }

  get unsubscribeToken() {
    return NotificationSetting.getUnsubscribeToken(this.userId);
  }

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  static getUnsubscribeToken = (userId: string) => {
    const hash = crypto.createHash("sha256");
    hash.update(`${userId}-${process.env.SECRET_KEY}`);
    return hash.digest("hex");
  };
}

export default NotificationSetting;
