import { sequelize } from "../sequelize";

const GroupUser = sequelize.define(
  "group_user",
  {},
  {
    timestamps: true,
    paranoid: true,
  }
);

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
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
    include: [
      {
        association: "user",
      },
    ],
  });
};

export default GroupUser;
