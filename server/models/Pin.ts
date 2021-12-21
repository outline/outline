import { DataTypes, sequelize } from "../sequelize";

const Pin = sequelize.define(
  "pins",
  {
    index: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  },
  {
    timestamps: true,
  }
);

Pin.associate = (models: any) => {
  Pin.belongsTo(models.Collection, {
    as: "collection",
    foreignKey: "collectionId",
    primary: true,
  });
  Pin.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
    primary: true,
  });
  Pin.belongsTo(models.User, {
    as: "createdBy",
    foreignKey: "createdById",
  });
};

export default Pin;
