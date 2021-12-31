import { DataTypes, sequelize } from "../sequelize";

const Pin = sequelize.define(
  "pins",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    teamId: {
      type: DataTypes.UUID,
    },
    documentId: {
      type: DataTypes.UUID,
    },
    collectionId: {
      type: DataTypes.UUID,
      defaultValue: null,
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
  });
  Pin.belongsTo(models.Collection, {
    as: "collection",
    foreignKey: "collectionId",
  });
  Pin.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
  Pin.belongsTo(models.User, {
    as: "createdBy",
    foreignKey: "createdById",
  });
};

export default Pin;
