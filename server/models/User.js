// @flow
import crypto from 'crypto';
import uuid from 'uuid';
import JWT from 'jsonwebtoken';
import subMinutes from 'date-fns/sub_minutes';
import { DataTypes, sequelize, encryptedFields } from '../sequelize';
import { publicS3Endpoint, uploadToS3FromUrl } from '../utils/s3';
import { sendEmail } from '../mailer';
import { Star, Team, Collection, NotificationSetting, ApiKey } from '.';

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
    isAdmin: DataTypes.BOOLEAN,
    service: { type: DataTypes.STRING, allowNull: true },
    serviceId: { type: DataTypes.STRING, allowNull: true, unique: true },
    slackData: DataTypes.JSONB,
    jwtSecret: encryptedFields.vault('jwtSecret'),
    lastActiveAt: DataTypes.DATE,
    lastActiveIp: { type: DataTypes.STRING, allowNull: true },
    lastSignedInAt: DataTypes.DATE,
    lastSignedInIp: { type: DataTypes.STRING, allowNull: true },
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
  }
);

// Class methods
User.associate = models => {
  User.hasMany(models.ApiKey, { as: 'apiKeys', onDelete: 'cascade' });
  User.hasMany(models.NotificationSetting, {
    as: 'notificationSettings',
    onDelete: 'cascade',
  });
  User.hasMany(models.Document, { as: 'documents' });
  User.hasMany(models.View, { as: 'views' });
};

// Instance methods
User.prototype.collectionIds = async function() {
  let models = await Collection.findAll({
    attributes: ['id', 'private'],
    where: { teamId: this.teamId },
    include: [
      {
        model: User,
        through: 'collection_users',
        as: 'users',
        where: { id: this.id },
        required: false,
      },
    ],
  });

  // Filter collections that are private and don't have an association
  return models.filter(c => !c.private || c.users.length).map(c => c.id);
};

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

const removeIdentifyingInfo = async (model, options) => {
  await NotificationSetting.destroy({
    where: { userId: model.id },
    transaction: options.transaction,
  });
  await ApiKey.destroy({
    where: { userId: model.id },
    transaction: options.transaction,
  });
  await Star.destroy({
    where: { userId: model.id },
    transaction: options.transaction,
  });

  model.email = '';
  model.name = 'Unknown';
  model.avatarUrl = '';
  model.serviceId = null;
  model.username = null;
  model.slackData = null;
  model.lastActiveIp = null;
  model.lastSignedInIp = null;

  // this shouldn't be needed once this issue is resolved:
  // https://github.com/sequelize/sequelize/issues/9318
  await model.save({ hooks: false, transaction: options.transaction });
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

User.beforeDestroy(checkLastAdmin);
User.beforeDestroy(removeIdentifyingInfo);
User.beforeSave(uploadAvatar);
User.beforeCreate(setRandomJwtSecret);
User.afterCreate(async user => {
  const team = await Team.findByPk(user.teamId);

  // From Slack support:
  // If you wish to contact users at an email address obtained through Slack,
  // you need them to opt-in through a clear and separate process.
  if (!team.slackId) {
    sendEmail('welcome', user.email, { teamUrl: team.url });
  }
});

// By default when a user signs up we subscribe them to email notifications
// when documents they created are edited by other team members and onboarding
User.afterCreate(async (user, options) => {
  await NotificationSetting.findOrCreate({
    where: {
      userId: user.id,
      teamId: user.teamId,
      event: 'documents.update',
    },
    transaction: options.transaction,
  });
  await NotificationSetting.findOrCreate({
    where: {
      userId: user.id,
      teamId: user.teamId,
      event: 'emails.onboarding',
    },
    transaction: options.transaction,
  });
});

export default User;
