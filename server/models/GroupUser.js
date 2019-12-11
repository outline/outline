// @flow
import { sequelize } from '../sequelize';

const GroupUser = sequelize.define(
  'group_user',
  {},
  {
    timestamps: true,
  }
);

GroupUser.associate = models => {
  GroupUser.belongsTo(models.Group, {
    as: 'group',
    foreignKey: 'groupId',
  });
  GroupUser.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
  GroupUser.belongsTo(models.User, {
    as: 'createdBy',
    foreignKey: 'createdById',
  });
};

export default GroupUser;
