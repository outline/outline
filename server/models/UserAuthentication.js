// @flow
import { DataTypes, sequelize } from "../sequelize";

const UserAuthentication = sequelize.define(
  "user_authentications",
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

UserAuthentication.associate = (models) => {
  UserAuthentication.belongsTo(models.AuthenticationProvider);
  UserAuthentication.belongsTo(models.User);
};

export default UserAuthentication;
