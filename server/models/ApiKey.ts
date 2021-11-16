import randomstring from "randomstring";
import { DataTypes, sequelize } from "../sequelize";

const ApiKey = sequelize.define(
  "apiKey",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    secret: {
      type: DataTypes.STRING,
      unique: true,
    },
  },
  {
    paranoid: true,
    hooks: {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'key' implicitly has an 'any' type.
      beforeValidate: (key) => {
        key.secret = randomstring.generate(38);
      },
    },
  }
);

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
ApiKey.associate = (models) => {
  ApiKey.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
};

export default ApiKey;
