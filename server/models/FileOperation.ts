import { deleteFromS3 } from "@server/utils/s3";
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
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'model' implicitly has an 'any' type.
FileOperation.beforeDestroy(async (model) => {
  await deleteFromS3(model.key);
});

FileOperation.prototype.expire = async function () {
  this.state = "expired";
  await deleteFromS3(this.key);
  await this.save();
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
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
  FileOperation.addScope("defaultScope", {
    include: [
      {
        model: models.User,
        as: "user",
        paranoid: false,
      },
      {
        model: models.Collection,
        as: "collection",
        paranoid: false,
      },
    ],
  });
};

export default FileOperation;
