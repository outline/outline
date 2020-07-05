// @flow
import { DataTypes, sequelize, encryptedFields } from "../sequelize";

const Authentication = sequelize.define("authentication", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  service: DataTypes.STRING,
  scopes: DataTypes.ARRAY(DataTypes.STRING),
  token: encryptedFields.vault("token"),
});

Authentication.associate = models => {
  Authentication.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  Authentication.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
};

export default Authentication;
