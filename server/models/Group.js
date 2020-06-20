// @flow
import { Op, DataTypes, sequelize } from "../sequelize";
import { CollectionGroup, GroupUser } from "../models";

const Group = sequelize.define(
  "group",
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
    paranoid: true,
    validate: {
      isUniqueNameInTeam: async function() {
        const foundItem = await Group.findOne({
          where: {
            teamId: this.teamId,
            name: { [Op.iLike]: this.name },
            id: { [Op.not]: this.id },
          },
        });
        if (foundItem) {
          throw new Error("The name of this group is already in use");
        }
      },
    },
  }
);

Group.associate = models => {
  Group.hasMany(models.GroupUser, {
    as: "groupMemberships",
    foreignKey: "groupId",
  });
  Group.hasMany(models.CollectionGroup, {
    as: "collectionGroupMemberships",
    foreignKey: "groupId",
  });
  Group.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
  Group.belongsTo(models.User, {
    as: "createdBy",
    foreignKey: "createdById",
  });
  Group.belongsToMany(models.User, {
    as: "users",
    through: models.GroupUser,
    foreignKey: "groupId",
  });
  Group.addScope("defaultScope", {
    include: [
      {
        association: "groupMemberships",
        required: false,
      },
    ],
    order: [["name", "ASC"]],
  });
};

// Cascade deletes to group and collection relations
Group.addHook("afterDestroy", async (group, options) => {
  if (!group.deletedAt) return;

  await GroupUser.destroy({ where: { groupId: group.id } });
  await CollectionGroup.destroy({ where: { groupId: group.id } });
});

export default Group;
