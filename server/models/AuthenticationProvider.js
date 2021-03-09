// @flow
import fs from "fs";
import path from "path";
import { DataTypes, sequelize } from "../sequelize";

// Each authentication provider must have a definition under server/auth, the
// name of the file will be used as reference in the db, one less thing to config
const authProviders = fs
  .readdirSync(path.resolve(__dirname, "..", "auth"))
  .filter(
    (file) =>
      file.indexOf(".") !== 0 &&
      !file.includes(".test") &&
      !file.includes("index.js")
  )
  .map((fileName) => fileName.replace(".js", ""));

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
        isIn: [authProviders],
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
