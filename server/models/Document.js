import {
  DataTypes,
  sequelize,
} from '../sequelize';
import Atlas from './Atlas';
import Team from './Team';

const Document = sequelize.define('document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  content: DataTypes.STRING,
});

Document.belongsTo(Atlas);
Document.belongsTo(Team);

export default Atlas;
