import {
  DataTypes,
  sequelize,
} from '../sequelize';
import Atlas from './Atlas';
import Document from './Document';
import User from './User';

const Team = sequelize.define('team', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  slackId: { type: DataTypes.STRING, unique: true },
  slackData: DataTypes.JSONB,
}, {
  instanceMethods: {
    async createFirstAtlas() {
      const atlas = await Atlas.create({
        name: this.name,
        description: 'Your first Atlas',
        type: 'journal',
        teamId: this.id,
      });
      return atlas;
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['slackId']
    },
  ],
});

Team.hasMany(Atlas, { as: 'atlases' });
Team.hasMany(Document, { as: 'documents' });
Team.hasMany(User, { as: 'users' });

export default Team;
