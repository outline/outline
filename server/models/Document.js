import slug from 'slug';
import randomstring from 'randomstring';
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

slug.defaults.mode ='rfc3986';

const generateSlug = (title, urlId) => {
  const slugifiedTitle = slug(title);
  return `${slugifiedTitle}-${urlId}`;
};

const Document = sequelize.define('document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  urlId: { type: DataTypes.STRING, primaryKey: true },
  private: { type: DataTypes.BOOLEAN, defaultValue: true },
  title: DataTypes.STRING,
  text: DataTypes.TEXT,
  html: DataTypes.TEXT,
  preview: DataTypes.TEXT,
}, {
  hooks: {
    beforeValidate: (doc) => {
      doc.urlId = randomstring.generate(15);
    },
    beforeCreate: (doc) => {
      doc.html = convertToMarkdown(doc.text);
      doc.preview = truncateMarkdown(doc.text, 160);
    },
    beforeUpdate: (doc) => {
      doc.html = convertToMarkdown(doc.text);
      doc.preview = truncateMarkdown(doc.text, 160);
    },
  },
  instanceMethods: {
    buildUrl() {
      const slugifiedTitle = slug(this.title);
      return `${slugifiedTitle}-${this.urlId}`;
    }
  }
});

Document.belongsTo(Atlas, { as: 'atlas' });
Document.belongsTo(Team);
Document.belongsTo(User);

export default Document;
