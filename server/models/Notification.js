// @flow
import { DataTypes, sequelize } from '../sequelize';

const Notification = sequelize.define('notification', {
  event: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.BOOLEAN,
  },
});

Notification.associate = models => {
  Notification.belongsTo(models.User, {
    as: 'actor',
    foreignKey: 'actorId',
  });
  Notification.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
};

export default Notification;
