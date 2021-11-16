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

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
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
