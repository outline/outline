// @flow
import { DataTypes, sequelize } from "../sequelize";

const RequestedDoc = sequelize.define("requested_doc", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: DataTypes.STRING,
  collectionId: DataTypes.STRING,
  userId: DataTypes.STRING,
  like: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

RequestedDoc.associate = (models) => {
  RequestedDoc.hasMany(models.Follow, {
    as: "liked",
    onDelete: "cascade",
  });

  RequestedDoc.addScope("withLiked", (userId) => ({
    include: [
      { model: models.Follow, as: "liked", where: { userId }, required: false },
    ],
  }));
};

export default RequestedDoc;
