import slug from 'slug';
import _ from 'lodash';
import randomstring from 'randomstring';
import {
  DataTypes,
  sequelize,
} from '../sequelize';
import {
  convertToMarkdown,
} from '../../frontend/utils/markdown';
import {
  truncateMarkdown,
} from '../utils/truncate';
import User from './User';
import Revision from './Revision';

slug.defaults.mode = 'rfc3986';

const createRevision = async (doc) => {
  // Create revision of the current (latest)
  await Revision.create({
    title: doc.title,
    text: doc.text,
    html: doc.html,
    preview: doc.preview,
    userId: doc.lastModifiedById,
    documentId: doc.id,
  });
};

const documentBeforeSave = async (doc) => {
  doc.html = convertToMarkdown(doc.text);
  doc.preview = truncateMarkdown(doc.text, 160);

  doc.revisionCount = doc.revisionCount + 1;

  // Collaborators
  const ids = await Revision.findAll({
    attributes: [[DataTypes.literal('DISTINCT "userId"'), 'userId']],
  }).map(rev => rev.userId);
  // We'll add the current user as revision hasn't been generated yet
  ids.push(doc.lastModifiedById);
  doc.collaboratorIds = _.uniq(ids);

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
  revisionCount: { type: DataTypes.INTEGER, defaultValue: 0 },

  parentDocumentId: DataTypes.UUID,
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
    },
  },
  lastModifiedById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
    },
  },
  collaboratorIds: DataTypes.ARRAY(DataTypes.UUID),
}, {
  paranoid: true,
  hooks: {
    beforeValidate: (doc) => {
      doc.urlId = doc.urlId || randomstring.generate(10);
    },
    beforeCreate: documentBeforeSave,
    beforeUpdate: documentBeforeSave,
    afterCreate: async (doc) => await createRevision(doc),
    afterUpdate: async (doc) => await createRevision(doc),
  },
  instanceMethods: {
    getUrl() {
      const slugifiedTitle = slug(this.title);
      return `/d/${slugifiedTitle}-${this.urlId}`;
    },
  },
});

Document.belongsTo(User);

export default Document;
