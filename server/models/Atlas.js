import {
  DataTypes,
  sequelize,
} from '../sequelize';
import Team from './Team';

const allowedAtlasTypes = [['atlas', 'journal']];

const Atlas = sequelize.define('atlas', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  description: DataTypes.STRING,
  type: { type: DataTypes.STRING, validate: { isIn: allowedAtlasTypes }},
});

Atlas.belongsTo(Team);

export default Atlas;
