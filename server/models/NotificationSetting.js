// @flow
import { DataTypes, sequelize } from '../sequelize';

const NotificationSetting = sequelize.define(
  'notification_setting',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
  }
);

NotificationSetting.associate = models => {
  NotificationSetting.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
  NotificationSetting.belongsTo(models.Team, {
    as: 'team',
    foreignKey: 'teamId',
  });
};

export default NotificationSetting;
