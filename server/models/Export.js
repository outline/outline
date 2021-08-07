// @flow
import { DataTypes, sequelize } from "../sequelize";

const Export = sequelize.define("export", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  state: {
    type: DataTypes.ENUM(
      "creating",
      "uploading",
      "complete",
      "error",
      "expired"
    ),
    allowNull: false,
  },
  key: {
    type: DataTypes.STRING,
  },
  url: {
    type: DataTypes.STRING,
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
});

Export.associate = (models) => {
  Export.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  Export.belongsTo(models.Collection, {
    as: "collection",
    foreignKey: "collectionId",
  });
  Export.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
};

export default Export;
