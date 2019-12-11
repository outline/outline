// @flow
import { DataTypes, sequelize } from '../sequelize';

const Group = sequelize.define(
  'group',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

Group.associate = models => {
  Group.hasMany(models.GroupUser, {
    as: 'memberships',
    foreignKey: 'groupId',
    onDelete: 'cascade',
  });
  Group.belongsTo(models.Team, {
    as: 'team',
    foreignKey: 'teamId',
  });
  Group.belongsTo(models.User, {
    as: 'createdBy',
    foreignKey: 'createdById',
  });
};

export default Group;
