// @flow
import { Op, DataTypes, sequelize } from '../sequelize';

const Group = sequelize.define(
  'group',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    teamId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    validate: {
      isUniqueNameInTeam: async function() {
        const foundItem = await Group.findOne({
          where: {
            name: { [Op.iLike]: this.name },
            id: { [Op.not]: this.id },
          },
        });
        if (foundItem) {
          throw new Error('The name of this group is already in use');
        }
      },
    },
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
  Group.belongsToMany(models.User, {
    as: 'users',
    through: models.GroupUser,
    foreignKey: 'groupId',
  });
};

export default Group;
