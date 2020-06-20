// @flow
import crypto from "crypto";
import { DataTypes, sequelize } from "../sequelize";

const NotificationSetting = sequelize.define(
  "notification_setting",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event: {
      type: DataTypes.STRING,
      validate: {
        isIn: [
          [
            "documents.publish",
            "documents.update",
            "collections.create",
            "emails.onboarding",
            "emails.features",
          ],
        ],
      },
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    getterMethods: {
      unsubscribeUrl: function() {
        const token = NotificationSetting.getUnsubscribeToken(this.userId);
        return `${process.env.URL}/api/notificationSettings.unsubscribe?token=${
          token
        }&id=${this.id}`;
      },
      unsubscribeToken: function() {
        return NotificationSetting.getUnsubscribeToken(this.userId);
      },
    },
  }
);

NotificationSetting.getUnsubscribeToken = userId => {
  const hash = crypto.createHash("sha256");
  hash.update(`${userId}-${process.env.SECRET_KEY}`);
  return hash.digest("hex");
};

NotificationSetting.associate = models => {
  NotificationSetting.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
    onDelete: "cascade",
  });
  NotificationSetting.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
};

export default NotificationSetting;
