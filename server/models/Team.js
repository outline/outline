import { DataTypes, sequelize } from '../sequelize';
import Collection from './Collection';
import Document from './Document';
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
    instanceMethods: {
      async createFirstCollection(userId) {
        const atlas = await Collection.create({
          name: this.name,
          description: 'Your first Collection',
          type: 'atlas',
          teamId: this.id,
          creatorId: userId,
        });
        return atlas;
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['slackId'],
      },
    ],
  }
);

Team.hasMany(Collection, { as: 'atlases' });
Team.hasMany(Document, { as: 'documents' });
Team.hasMany(User, { as: 'users' });

export default Team;
