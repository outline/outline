import { DataTypes, sequelize } from "../sequelize";

const Pin = sequelize.define(
  "pins",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
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
  Pin.belongsTo(models.Document, {
    as: "document",
    foreignKey: "documentId",
    primary: true,
  });
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
