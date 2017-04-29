import slug from 'slug';
import _ from 'lodash';
import randomstring from 'randomstring';
import { DataTypes, sequelize } from '../sequelize';
import { convertToMarkdown } from '../../frontend/utils/markdown';
import { truncateMarkdown } from '../utils/truncate';
import User from './User';
import Revision from './Revision';

slug.defaults.mode = 'rfc3986';
const slugify = text =>
  slug(text, {
    remove: /[.]/g,
  });

const createRevision = async doc => {
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

const documentBeforeSave = async doc => {
  doc.html = convertToMarkdown(doc.text);
  doc.preview = truncateMarkdown(doc.text, 160);

  doc.revisionCount += 1;

  // Collaborators
  let ids = [];
  // Only get previous user IDs if the document already exists
  if (doc.id) {
    ids = await Revision.findAll({
      attributes: [[DataTypes.literal('DISTINCT "userId"'), 'userId']],
      where: {
        documentId: doc.id,
      },
    }).map(rev => rev.userId);
  }
  // We'll add the current user as revision hasn't been generated yet
  ids.push(doc.lastModifiedById);
  doc.collaboratorIds = _.uniq(ids);

  return doc;
};

const Document = sequelize.define(
  'document',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
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
  },
  {
    paranoid: true,
    hooks: {
      beforeValidate: doc => {
        doc.urlId = doc.urlId || randomstring.generate(10);
      },
      beforeCreate: documentBeforeSave,
      beforeUpdate: documentBeforeSave,
      afterCreate: async doc => await createRevision(doc),
      afterUpdate: async doc => await createRevision(doc),
    },
    instanceMethods: {
      getUrl() {
        const slugifiedTitle = slugify(this.title);
        return `/d/${slugifiedTitle}-${this.urlId}`;
      },
    },
  }
);

Document.belongsTo(User);

Document.searchForUser = async (user, query, options = {}) => {
  const limit = options.limit || 15;
  const offset = options.offset || 0;

  const sql = `
  SELECT * FROM documents
  WHERE "searchVector" @@ plainto_tsquery('english', :query) AND
    "teamId" = '${user.teamId}'::uuid AND
    "deletedAt" IS NULL
  ORDER BY ts_rank(documents."searchVector", plainto_tsquery('english', :query)) DESC
  LIMIT :limit OFFSET :offset;
  `;

  const documents = await sequelize.query(sql, {
    replacements: {
      query,
      limit,
      offset,
    },
    model: Document,
  });

  return documents;
};

export default Document;
