import {
  DataTypes,
  sequelize,
} from '../sequelize';

const Team = sequelize.define('team', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  slackId: { type: DataTypes.STRING, unique: true },
  slackData: DataTypes.JSONB,
}, {
  indexes: [
    {
      unique: true,
      fields: ['slackId']
    },
  ],
});

export default Team;
