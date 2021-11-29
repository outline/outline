import { DataTypes, sequelize } from "../sequelize";

const CollectionGroup = sequelize.define(
  "collection_group",
  {
    permission: {
      type: DataTypes.STRING,
      defaultValue: "read_write",
      validate: {
        isIn: [["read", "read_write", "maintainer"]],
      },
    },
  },
  {
    timestamps: true,
    paranoid: true,
  }
);

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
CollectionGroup.associate = (models) => {
  CollectionGroup.belongsTo(models.Collection, {
    as: "collection",
    foreignKey: "collectionId",
    primary: true,
  });
  CollectionGroup.belongsTo(models.Group, {
    as: "group",
    foreignKey: "groupId",
    primary: true,
  });
  CollectionGroup.belongsTo(models.User, {
    as: "createdBy",
    foreignKey: "createdById",
  });
};

export default CollectionGroup;
