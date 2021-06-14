// @flow
import { DataTypes, sequelize, encryptedFields } from "../sequelize";

const IntegrationAuthentication = sequelize.define("authentication", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  service: DataTypes.STRING,
  scopes: DataTypes.ARRAY(DataTypes.STRING),
  token: encryptedFields().vault("token"),
});

IntegrationAuthentication.associate = (models) => {
  IntegrationAuthentication.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  IntegrationAuthentication.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
};

export default IntegrationAuthentication;
