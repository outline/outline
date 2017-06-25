import { DataTypes, sequelize } from '../sequelize';
import randomstring from 'randomstring';

const ApiKey = sequelize.define(
  'apiKeys',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    secret: { type: DataTypes.STRING, unique: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
      },
    },
  },
  {
    tableName: 'apiKeys',
    paranoid: true,
    hooks: {
      beforeValidate: key => {
        key.secret = randomstring.generate(38);
      },
    },
  }
);

export default ApiKey;
