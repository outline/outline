import {
  DataTypes,
  sequelize,
} from '../sequelize';
import Atlas from './Atlas';
import Team from './Team';
import User from './User';

const Document = sequelize.define('document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: DataTypes.STRING,
  text: DataTypes.TEXT,
});

Document.belongsTo(Atlas, { as: 'atlas' });
Document.belongsTo(Team);
Document.belongsTo(User);

export default Document;
