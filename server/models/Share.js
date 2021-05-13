// @flow
import { DataTypes, sequelize } from "../sequelize";

const Share = sequelize.define(
  "share",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    published: DataTypes.BOOLEAN,
    revokedAt: DataTypes.DATE,
    revokedById: DataTypes.UUID,
    lastAccessedAt: DataTypes.DATE,
  },
  {
    getterMethods: {
      isRevoked() {
        return !!this.revokedAt;
      },
    },
  }
);

Share.associate = (models) => {
  Share.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  Share.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
  Share.belongsTo(models.Document.scope("withUnpublished"), {
    as: "document",
    foreignKey: "documentId",
  });
  Share.addScope("defaultScope", {
    include: [
      { association: "user", paranoid: false },
      { association: "document" },
      { association: "team" },
    ],
  });
};

Share.prototype.revoke = function (userId) {
  this.revokedAt = new Date();
  this.revokedById = userId;
  return this.save();
};

export default Share;
