import {
  DataTypes,
  sequelize,
} from '../sequelize';
import {
  convertToMarkdown,
  truncateMarkdown,
} from '../utils/markdown';
import Atlas from './Atlas';
import Team from './Team';
import User from './User';

const Document = sequelize.define('document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: DataTypes.STRING,
  text: DataTypes.TEXT,
  html: DataTypes.TEXT,
  preview: DataTypes.TEXT,
}, {
  hooks: {
    beforeCreate: (doc) => {
      doc.html = convertToMarkdown(doc.text);
      doc.preview = truncateMarkdown(doc.text, 160);
    },
    beforeUpdate: (doc) => {
      doc.html = convertToMarkdown(doc.text);
      doc.preview = truncateMarkdown(doc.text, 160);
    },
  }
});

Document.belongsTo(Atlas, { as: 'atlas' });
Document.belongsTo(Team);
Document.belongsTo(User);

export default Document;
