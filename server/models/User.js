// @flow
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import uuid from 'uuid';
import { DataTypes, sequelize, encryptedFields } from '../sequelize';
import { uploadToS3FromUrl } from '../utils/s3';
import mailer from '../mailer';

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
    email: { type: DataTypes.STRING },
    username: { type: DataTypes.STRING },
    name: DataTypes.STRING,
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
    password: DataTypes.VIRTUAL,
    passwordDigest: DataTypes.STRING,
    isAdmin: DataTypes.BOOLEAN,
    slackAccessToken: encryptedFields.vault('slackAccessToken'),
    slackId: { type: DataTypes.STRING, allowNull: true, unique: true },
    slackData: DataTypes.JSONB,
    jwtSecret: encryptedFields.vault('jwtSecret'),
  },
  {
    indexes: [
      {
        fields: ['email'],
      },
    ],
  }
);

// Class methods
User.associate = models => {
  User.hasMany(models.ApiKey, { as: 'apiKeys' });
  User.hasMany(models.Document, { as: 'documents' });
  User.hasMany(models.View, { as: 'views' });
};

// Instance methods
User.prototype.getJwtToken = function() {
  return JWT.sign({ id: this.id }, this.jwtSecret);
};
User.prototype.getTeam = async function() {
  return this.team;
};
User.prototype.verifyPassword = function(password) {
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
};
User.prototype.updateAvatar = async function() {
  this.avatarUrl = await uploadToS3FromUrl(
    this.slackData.image_192,
    `avatars/${this.id}/${uuid.v4()}`
  );
};

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
User.afterCreate(user => mailer.welcome(user.email));

export default User;
