// @flow
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import uuid from 'uuid';
import JWT from 'jsonwebtoken';
import subMinutes from 'date-fns/sub_minutes';
import { DataTypes, sequelize, encryptedFields } from '../sequelize';
import { publicS3Endpoint, uploadToS3FromUrl } from '../utils/s3';
import { sendEmail } from '../mailer';

const BCRYPT_COST = process.env.NODE_ENV === 'production' ? 12 : 4;

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
    service: { type: DataTypes.STRING, allowNull: true },
    serviceId: { type: DataTypes.STRING, allowNull: true, unique: true },
    slackData: DataTypes.JSONB,
    jwtSecret: encryptedFields.vault('jwtSecret'),
    lastActiveAt: DataTypes.DATE,
    lastActiveIp: DataTypes.STRING,
    lastSignedInAt: DataTypes.DATE,
    lastSignedInIp: DataTypes.STRING,
    suspendedAt: DataTypes.DATE,
    suspendedById: DataTypes.UUID,
  },
  {
    paranoid: true,
    getterMethods: {
      isSuspended() {
        return !!this.suspendedAt;
      },
    },
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
User.prototype.updateActiveAt = function(ip) {
  const fiveMinutesAgo = subMinutes(new Date(), 5);

  // ensure this is updated only every few minutes otherwise
  // we'll be constantly writing to the DB as API requests happen
  if (this.lastActiveAt < fiveMinutesAgo) {
    this.lastActiveAt = new Date();
    this.lastActiveIp = ip;
    return this.save({ hooks: false });
  }
};

User.prototype.updateSignedIn = function(ip) {
  this.lastSignedInAt = new Date();
  this.lastSignedInIp = ip;
  return this.save({ hooks: false });
};

User.prototype.getJwtToken = function() {
  return JWT.sign({ id: this.id }, this.jwtSecret);
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

const uploadAvatar = async model => {
  const endpoint = publicS3Endpoint();

  if (model.avatarUrl && !model.avatarUrl.startsWith(endpoint)) {
    const newUrl = await uploadToS3FromUrl(
      model.avatarUrl,
      `avatars/${model.id}/${uuid.v4()}`
    );
    if (newUrl) model.avatarUrl = newUrl;
  }
};

const setRandomJwtSecret = model => {
  model.jwtSecret = crypto.randomBytes(64).toString('hex');
};

const hashPassword = model => {
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

const removeIdentifyingInfo = model => {
  model.email = '';
  model.username = '';
  model.slackData = null;
  model.serviceId = null;
  model.isAdmin = false;
};

const checkLastAdmin = async model => {
  const teamId = model.teamId;

  if (model.isAdmin) {
    const userCount = await User.count({ where: { teamId } });
    const adminCount = await User.count({ where: { isAdmin: true, teamId } });

    if (userCount > 1 && adminCount <= 1) {
      throw new Error(
        'Cannot delete account as only admin. Please transfer admin permissions to another user and try again.'
      );
    }
  }
};

User.beforeCreate(hashPassword);
User.beforeUpdate(hashPassword);
User.beforeDestroy(checkLastAdmin);
User.beforeDestroy(removeIdentifyingInfo);
User.beforeSave(uploadAvatar);
User.beforeCreate(setRandomJwtSecret);
User.afterCreate(user => sendEmail('welcome', user.email));

export default User;
