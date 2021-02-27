// @flow
import { DataTypes, sequelize } from "../sequelize";

const UserAuthenticationProvider = sequelize.define(
  "user_authentication_providers",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    serviceId: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
  }
);

UserAuthenticationProvider.associate = (models) => {
  UserAuthenticationProvider.belongsTo(models.AuthenticationProvider);
  UserAuthenticationProvider.belongsTo(models.User);
};

export default UserAuthenticationProvider;
