// @flow
import { DataTypes, sequelize, Op } from '../sequelize';
import Collection from './Collection';
import User from './User';

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
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['slackId'],
      },
    ],
  }
);

Team.associate = models => {
  Team.hasMany(models.Collection, { as: 'collections' });
  Team.hasMany(models.Document, { as: 'documents' });
  Team.hasMany(models.User, { as: 'users' });
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

Team.prototype.suspendUser = async function(user: User, admin: User) {
  if (user.id === admin.id)
    throw new Error('Unable to suspend the current user');
  return user.update({
    suspendedById: admin.id,
    suspendedAt: new Date(),
  });
};

Team.prototype.activateUser = async function(user: User, admin: User) {
  return user.update({
    suspendedById: null,
    suspendedAt: null,
  });
};

export default Team;
