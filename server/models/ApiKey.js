// @flow
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
    secret: { type: DataTypes.STRING, unique: true },
  },
  {
    paranoid: true,
    hooks: {
      beforeValidate: (key) => {
        key.secret = randomstring.generate(38);
      },
    },
  }
);

ApiKey.associate = (models) => {
  ApiKey.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
};

export default ApiKey;
