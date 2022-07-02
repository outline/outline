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
  Default,
  DataType,
} from "sequelize-typescript";
import env from "@server/env";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";

@Table({
  tableName: "notification_settings",
  modelName: "notification_setting",
  updatedAt: false,
})
@Fix
class NotificationSetting extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column
  id: string;

  @CreatedAt
  createdAt: Date;

  @IsIn([
    [
      "documents.publish",
      "documents.update",
      "collections.create",
      "emails.invite_accepted",
      "emails.onboarding",
      "emails.features",
    ],
  ])
  @Column(DataType.STRING)
  event: string;

  // getters

  get unsubscribeUrl() {
    return `${env.URL}/api/notificationSettings.unsubscribe?token=${this.unsubscribeToken}&id=${this.id}`;
  }

  get unsubscribeToken() {
    const hash = crypto.createHash("sha256");
    hash.update(`${this.userId}-${env.SECRET_KEY}`);
    return hash.digest("hex");
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
}

export default NotificationSetting;
