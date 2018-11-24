// @flow
import { DataTypes, sequelize } from '../sequelize';

const NotificationSetting = sequelize.define('notification_setting', {
  event: {
    type: DataTypes.STRING,
  },
});

NotificationSetting.associate = models => {
  NotificationSetting.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
};

export default NotificationSetting;
