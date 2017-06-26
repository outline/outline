import { DataTypes, sequelize } from '../sequelize';
import Collection from './Collection';

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
    classMethods: {
      associate: models => {
        Team.hasMany(models.Collection, { as: 'atlases' });
        Team.hasMany(models.Document, { as: 'documents' });
        Team.hasMany(models.User, { as: 'users' });
      },
    },
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

export default Team;
