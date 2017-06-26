import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { DataTypes, sequelize, encryptedFields } from '../sequelize';

import JWT from 'jsonwebtoken';

const BCRYPT_COST = process.env.NODE_ENV !== 'production' ? 4 : 12;

const User = sequelize.define(
  'user',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING, unique: true },
    username: { type: DataTypes.STRING, unique: true },
    name: DataTypes.STRING,
    password: DataTypes.VIRTUAL,
    passwordDigest: DataTypes.STRING,
    isAdmin: DataTypes.BOOLEAN,
    slackAccessToken: encryptedFields.vault('slackAccessToken'),
    slackId: { type: DataTypes.STRING, allowNull: true },
    slackData: DataTypes.JSONB,
    jwtSecret: encryptedFields.vault('jwtSecret'),
  },
  {
    classMethods: {
      associate: models => {
        User.hasMany(models.ApiKey, { as: 'apiKeys' });
        User.hasMany(models.Collection, { as: 'collections' });
        User.hasMany(models.Document, { as: 'documents' });
        User.hasMany(models.View, { as: 'views' });
      },
    },
    instanceMethods: {
      getJwtToken() {
        return JWT.sign({ id: this.id }, this.jwtSecret);
      },
      async getTeam() {
        return this.team;
      },
      verifyPassword(password) {
        return new Promise((resolve, reject) => {
          if (!this.passwordDigest) {
            resolve(false);
            return;
          }

          bcrypt.compare(password, this.passwordDigest, (err, ok) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(ok);
          });
        });
      },
    },
    indexes: [
      {
        fields: ['email'],
      },
    ],
  }
);

const setRandomJwtSecret = model => {
  model.jwtSecret = crypto.randomBytes(64).toString('hex');
};
const hashPassword = function hashPassword(model) {
  if (!model.password) {
    return null;
  }

  return new Promise((resolve, reject) => {
    bcrypt.hash(model.password, BCRYPT_COST, (err, digest) => {
      if (err) {
        reject(err);
        return;
      }

      model.passwordDigest = digest;
      resolve();
    });
  });
};
User.beforeCreate(hashPassword);
User.beforeUpdate(hashPassword);
User.beforeCreate(setRandomJwtSecret);

export default User;
