// @flow
import providers from "../auth/providers";
import { DataTypes, sequelize } from "../sequelize";

const AuthenticationProvider = sequelize.define(
  "authentication_providers",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      validate: {
        isIn: [providers.map((p) => p.id)],
      },
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    providerId: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
  }
);

AuthenticationProvider.associate = (models) => {
  AuthenticationProvider.belongsTo(models.Team);
  AuthenticationProvider.hasMany(models.UserAuthentication);
};

export default AuthenticationProvider;
