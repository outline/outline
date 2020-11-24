// @flow
import { sequelize } from "../sequelize";

const GroupUser = sequelize.define(
  "group_user",
  {},
  {
    timestamps: true,
    paranoid: true,
  }
);

GroupUser.associate = (models) => {
  GroupUser.belongsTo(models.Group, {
    as: "group",
    foreignKey: "groupId",
    primary: true,
  });
  GroupUser.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
    primary: true,
  });
  GroupUser.belongsTo(models.User, {
    as: "createdBy",
    foreignKey: "createdById",
  });
  GroupUser.addScope("defaultScope", {
    include: [{ association: "user" }],
  });
};

export default GroupUser;
