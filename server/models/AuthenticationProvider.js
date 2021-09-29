// @flow
import { ValidationError } from "../errors";
import providers from "../routes/auth/providers";
import { DataTypes, Op, sequelize } from "../sequelize";

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

AuthenticationProvider.prototype.disable = async function () {
  const res = await AuthenticationProvider.findAndCountAll({
    where: {
      teamId: this.teamId,
      enabled: true,
      id: {
        [Op.ne]: this.id,
      },
    },
    limit: 1,
  });

  if (res.count >= 1) {
    return this.update({ enabled: false });
  } else {
    throw new ValidationError(
      "At least one authentication provider is required"
    );
  }
};

AuthenticationProvider.prototype.enable = async function () {
  return this.update({ enabled: true });
};

export default AuthenticationProvider;
