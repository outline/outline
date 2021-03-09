// @flow
import { DataTypes, sequelize, encryptedFields } from "../sequelize";

const UserAuthentication = sequelize.define("user_authentications", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  scopes: DataTypes.ARRAY(DataTypes.STRING),
  accessToken: encryptedFields().vault("accessToken"),
  refreshToken: encryptedFields().vault("refreshToken"),
  providerId: {
    type: DataTypes.STRING,
    unique: true,
  },
});

UserAuthentication.associate = (models) => {
  UserAuthentication.belongsTo(models.AuthenticationProvider);
  UserAuthentication.belongsTo(models.User);
};

export default UserAuthentication;
