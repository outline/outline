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
  const atlas = await Collection.create({
    name: this.name,
    description: 'Your first Collection',
    type: 'atlas',
    teamId: this.id,
    creatorId: userId,
  });
  return atlas;
};

Team.prototype.addAdmin = async function(user: User) {
  return await user.update({ isAdmin: true });
};

Team.prototype.removeAdmin = async function(user: User) {
  const res = await User.findAndCountAll({
    where: {
      teamId: user.teamId,
      isAdmin: true,
      id: {
        [Op.ne]: user.id,
      },
    },
    limit: 1,
  });
  if (res.count >= 1) {
    return await user.update({ isAdmin: false });
  } else {
    throw new Error('At least one admin is required');
  }
};

export default Team;
