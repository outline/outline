// @flow
import { DataTypes, sequelize } from "../sequelize";

const FileOperation = sequelize.define("file_operations", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM("import", "export"),
    allowNull: false,
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

FileOperation.associate = (models) => {
  FileOperation.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  FileOperation.belongsTo(models.Collection, {
    as: "collection",
    foreignKey: "collectionId",
  });
  FileOperation.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
};

export default FileOperation;
