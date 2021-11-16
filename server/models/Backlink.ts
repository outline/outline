import { DataTypes, sequelize } from "../sequelize";

const Backlink = sequelize.define("backlink", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
});

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
Backlink.associate = (models) => {
  Backlink.belongsTo(models.Document, {
    as: "document",
    foreignKey: "documentId",
  });
  Backlink.belongsTo(models.Document, {
    as: "reverseDocument",
    foreignKey: "reverseDocumentId",
  });
  Backlink.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
};

export default Backlink;
