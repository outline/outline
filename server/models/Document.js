import slug from 'slug';
import randomstring from 'randomstring';
import {
  DataTypes,
  sequelize,
} from '../sequelize';
import {
  convertToMarkdown,
} from '../../src/utils/markdown';
import {
  truncateMarkdown,
} from '../utils/truncate';
import User from './User';
import Revision from './Revision';

slug.defaults.mode ='rfc3986';

const generateSlug = (title, urlId) => {
  const slugifiedTitle = slug(title);
  return `${slugifiedTitle}-${urlId}`;
};

const documentBeforeSave = (doc) => {
  doc.html = convertToMarkdown(doc.text);
  doc.preview = truncateMarkdown(doc.text, 160);
  doc.revisionCount = doc.revisionCount + 1;
  return doc;
};

const Document = sequelize.define('document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  urlId: { type: DataTypes.STRING, primaryKey: true },
  private: { type: DataTypes.BOOLEAN, defaultValue: true },
  title: DataTypes.STRING,
  text: DataTypes.TEXT,
  html: DataTypes.TEXT,
  preview: DataTypes.TEXT,
  revisionCount: { type: DataTypes.INTEGER, defaultValue: 0, },

  parentDocumentId: DataTypes.UUID,
  lastModifiedById: {
    type: 'UUID',
    allowNull: false,
    references: {
      model: 'users',
    }
  },
}, {
  hooks: {
    beforeValidate: (doc) => {
      doc.urlId = randomstring.generate(15);
    },
    beforeCreate: documentBeforeSave,
    beforeUpdate: documentBeforeSave,
  },
  instanceMethods: {
    buildUrl() {
      const slugifiedTitle = slug(this.title);
      return `${slugifiedTitle}-${this.urlId}`;
    },
    getUrl() {
      return `/documents/${ this.id }`;
    },
    async createRevision() {
      // Create revision of the current (latest)
      await Revision.create({
        title: this.title,
        text: this.text,
        html: this.html,
        preview: this.preview,
        userId: this.lastModifiedById,
        documentId: this.id,
      });
    },
  }
});

Document.belongsTo(User);

export default Document;
