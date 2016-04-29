import {
  DataTypes,
  sequelize,
} from '../sequelize';
import Team from './Team';

const Atlas = sequelize.define('atlas', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
});

Atlas.belongsTo(Team);

export default Atlas;
