// @flow
import { DataTypes, sequelize } from "../sequelize";

const Integration = sequelize.define("integration", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: DataTypes.STRING,
  service: DataTypes.STRING,
  settings: DataTypes.JSONB,
  events: DataTypes.ARRAY(DataTypes.STRING),
});

Integration.associate = (models) => {
  Integration.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  Integration.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
  Integration.belongsTo(models.Collection, {
    as: "collection",
    foreignKey: "collectionId",
  });
  Integration.belongsTo(models.IntegrationAuthentication, {
    as: "authentication",
    foreignKey: "authenticationId",
  });
};

export default Integration;
