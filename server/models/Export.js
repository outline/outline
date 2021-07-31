// @flow
import { DataTypes, sequelize } from "../sequelize";
import { deleteFromS3 } from "../utils/s3";

const Export = sequelize.define("export", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  state: {
    type: DataTypes.ENUM("creating", "uploading", "complete", "error"),
    allowNull: false,
  },
  collectionId: {
    type: DataTypes.UUID,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  url: {
    type: DataTypes.STRING,
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
});

Export.beforeDestroy(async (model) => {
  await deleteFromS3(model.key);
});

Export.associate = (models) => {
  Export.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  Export.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
};

export default Export;
