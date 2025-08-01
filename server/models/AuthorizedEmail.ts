import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../storage/database";
interface AuthorizedEmailAttributes {
  id: string;
  email: string;
  teamId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuthorizedEmailCreationAttributes
  extends Optional<AuthorizedEmailAttributes, "id"> {}

class AuthorizedEmail
  extends Model<AuthorizedEmailAttributes, AuthorizedEmailCreationAttributes>
  implements AuthorizedEmailAttributes
{
  public id!: string;
  public email!: string;
  public teamId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AuthorizedEmail.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "team_email_unique",
      validate: {
        isEmail: true,
      },
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: "team_email_unique",
    },
  },
  {
    sequelize,
    tableName: "authorized_emails",
    indexes: [
      {
        unique: true,
        fields: ["teamId", "email"],
      },
    ],
  }
);

export default AuthorizedEmail;
