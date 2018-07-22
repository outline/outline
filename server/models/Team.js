// @flow
import uuid from 'uuid';
import { DataTypes, sequelize, Op } from '../sequelize';
import { publicS3Endpoint, uploadToS3FromUrl } from '../utils/s3';
import Collection from './Collection';
import User from './User';
import { subscriptionsQueue } from '../jobs/subscriptions';

const Team = sequelize.define(
  'team',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    slackId: { type: DataTypes.STRING, allowNull: true },
    googleId: { type: DataTypes.STRING, allowNull: true },
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
    slackData: DataTypes.JSONB,

    /* Billing related */
    userCount: DataTypes.INTEGER, // Only counts active users
    billingEmail: { type: DataTypes.STRING, allowNull: true },
    stripeCustomerId: { type: DataTypes.STRING, allowNull: true },
    stripeSubscriptionId: { type: DataTypes.STRING, allowNull: true },
    stripeSubscriptionStatus: { type: DataTypes.STRING, allowNull: true },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['slackId'],
      },
    ],
    getterMethods: {
      isSuspended() {
        return (
          process.env.BILLING_ENABLED &&
          this.userCount > process.env.FREE_USER_LIMIT &&
          this.stripeSubscriptionStatus !== 'active'
        );
      },
      isAtFreeLimit() {
        return (
          process.env.BILLING_ENABLED &&
          this.userCount === process.env.FREE_USER_LIMIT &&
          this.stripeSubscriptionStatus !== 'active'
        );
      },
    },
  }
);

Team.associate = models => {
  Team.hasMany(models.Collection, { as: 'collections' });
  Team.hasMany(models.Document, { as: 'documents' });
  Team.hasMany(models.User, { as: 'users' });
};

const uploadAvatar = async model => {
  const endpoint = publicS3Endpoint();

  if (model.avatarUrl && !model.avatarUrl.startsWith(endpoint)) {
    try {
      const newUrl = await uploadToS3FromUrl(
        model.avatarUrl,
        `avatars/${model.id}/${uuid.v4()}`
      );
      if (newUrl) model.avatarUrl = newUrl;
    } catch (_err) {}
  }
};

Team.prototype.createFirstCollection = async function(userId) {
  return await Collection.create({
    name: 'General',
    description: 'Your first Collection',
    type: 'atlas',
    teamId: this.id,
    creatorId: userId,
  });
};

Team.prototype.addAdmin = async function(user: User) {
  return user.update({ isAdmin: true });
};

Team.prototype.removeAdmin = async function(user: User) {
  const res = await User.findAndCountAll({
    where: {
      teamId: this.id,
      isAdmin: true,
      id: {
        // $FlowFixMe
        [Op.ne]: user.id,
      },
    },
    limit: 1,
  });
  if (res.count >= 1) {
    return user.update({ isAdmin: false });
  } else {
    throw new Error('At least one admin is required');
  }
};

Team.prototype.addUser = async function(userProps: {
  slackId: string,
  name: string,
  email: string,
  slackData: Object,
  slackAccessToken: string,
}) {
  const res = await User.findAndCountAll({
    where: {
      teamId: this.id,
      isAdmin: true,
    },
  });
  const adminCount = res.count;
  const user = await User.create({
    ...userProps,
    teamId: this.id,
    isAdmin: adminCount === 0,
  });

  // Set initial avatar
  await user.updateAvatar();
  await user.save();

  await this.createFirstCollection(user.id);

  await updateSubscriptions(this);
};

Team.prototype.suspendUser = async function(user: User, admin: User) {
  if (user.id === admin.id)
    throw new Error('Unable to suspend the current user');
  await user.update({
    suspendedById: admin.id,
    suspendedAt: new Date(),
  });

  await updateSubscriptions(this);
};

Team.prototype.activateUser = async function(user: User, admin: User) {
  await user.update({
    suspendedById: null,
    suspendedAt: null,
  });

  await updateSubscriptions(this);
};

const updateSubscriptions = async (team: Team) => {
  const { count } = await User.findAndCountAll({
    where: {
      teamId: team.id,
      suspendedAt: null,
    },
  });
  await team.update({
    userCount: count,
  });

  if (process.env.BILLING_ENABLED) {
    subscriptionsQueue.add({
      type: 'updateSubscription',
      teamId: team.id,
    });
  }
};

Team.beforeSave(uploadAvatar);

export default Team;
