// @flow
import slug from 'slug';
import { map, find, compact, uniq } from 'lodash';
import randomstring from 'randomstring';
import MarkdownSerializer from 'slate-md-serializer';
import Plain from 'slate-plain-serializer';
import Sequelize, { type Transaction } from 'sequelize';
import removeMarkdown from '@tommoor/remove-markdown';

import isUUID from 'validator/lib/isUUID';
import { Collection, User } from '../models';
import { DataTypes, sequelize } from '../sequelize';
import parseTitle from '../../shared/utils/parseTitle';
import unescape from '../../shared/utils/unescape';
import Revision from './Revision';

const Op = Sequelize.Op;
const Markdown = new MarkdownSerializer();
const URL_REGEX = /^[a-zA-Z0-9-]*-([a-zA-Z0-9]{10,15})$/;
const DEFAULT_TITLE = 'Untitled document';

slug.defaults.mode = 'rfc3986';
const slugify = text =>
  slug(text, {
    remove: /[.]/g,
  });

const createRevision = (doc, options = {}) => {
  // we don't create revisions for autosaves
  if (options.autosave) return;

  // we don't create revisions if identical to previous
  if (doc.text === doc.previous('text')) return;

  return Revision.create(
    {
      title: doc.title,
      text: doc.text,
      userId: doc.lastModifiedById,
      documentId: doc.id,
    },
    {
      transaction: options.transaction,
    }
  );
};

const createUrlId = doc => {
  return (doc.urlId = doc.urlId || randomstring.generate(10));
};

const beforeSave = async doc => {
  const { emoji, title } = parseTitle(doc.text);

  // emoji in the title is split out for easier display
  doc.emoji = emoji;

  // ensure document has a title
  if (!title) {
    doc.title = DEFAULT_TITLE;
    doc.text = doc.text.replace(/^.*$/m, `# ${DEFAULT_TITLE}`);
  }

  // add the current user as a collaborator on this doc
  if (!doc.collaboratorIds) doc.collaboratorIds = [];
  doc.collaboratorIds = uniq(doc.collaboratorIds.concat(doc.lastModifiedById));

  // increment revision
  doc.revisionCount += 1;

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
    urlId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Document title must be less than 100 characters',
        },
      },
    },
    text: DataTypes.TEXT,
    isWelcome: { type: DataTypes.BOOLEAN, defaultValue: false },
    revisionCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    archivedAt: DataTypes.DATE,
    publishedAt: DataTypes.DATE,
    parentDocumentId: DataTypes.UUID,
    collaboratorIds: DataTypes.ARRAY(DataTypes.UUID),
  },
  {
    paranoid: true,
    hooks: {
      beforeValidate: createUrlId,
      beforeCreate: beforeSave,
      beforeUpdate: beforeSave,
      afterCreate: createRevision,
      afterUpdate: createRevision,
    },
    getterMethods: {
      url: function() {
        const slugifiedTitle = slugify(this.title);
        return `/doc/${slugifiedTitle}-${this.urlId}`;
      },
    },
  }
);

// Class methods

Document.associate = models => {
  Document.belongsTo(models.Collection, {
    as: 'collection',
    foreignKey: 'collectionId',
    onDelete: 'cascade',
  });
  Document.belongsTo(models.Team, {
    as: 'team',
    foreignKey: 'teamId',
  });
  Document.belongsTo(models.User, {
    as: 'createdBy',
    foreignKey: 'createdById',
  });
  Document.belongsTo(models.User, {
    as: 'updatedBy',
    foreignKey: 'lastModifiedById',
  });
  Document.belongsTo(models.User, {
    as: 'pinnedBy',
    foreignKey: 'pinnedById',
  });
  Document.hasMany(models.Revision, {
    as: 'revisions',
    onDelete: 'cascade',
  });
  Document.hasMany(models.Backlink, {
    as: 'backlinks',
  });
  Document.hasMany(models.Star, {
    as: 'starred',
  });
  Document.hasMany(models.View, {
    as: 'views',
  });
  Document.addScope(
    'defaultScope',
    {
      include: [
        { model: models.Collection, as: 'collection' },
        { model: models.User, as: 'createdBy', paranoid: false },
        { model: models.User, as: 'updatedBy', paranoid: false },
      ],
      where: {
        publishedAt: {
          [Op.ne]: null,
        },
      },
    },
    { override: true }
  );
  Document.addScope('withUnpublished', {
    include: [
      { model: models.Collection, as: 'collection' },
      { model: models.User, as: 'createdBy', paranoid: false },
      { model: models.User, as: 'updatedBy', paranoid: false },
    ],
  });
  Document.addScope('withViews', userId => ({
    include: [
      { model: models.View, as: 'views', where: { userId }, required: false },
    ],
  }));
  Document.addScope('withStarred', userId => ({
    include: [
      { model: models.Star, as: 'starred', where: { userId }, required: false },
    ],
  }));
};

Document.findByPk = async (id, options) => {
  const scope = Document.scope('withUnpublished');

  if (isUUID(id)) {
    return scope.findOne({
      where: { id },
      ...options,
    });
  } else if (id.match(URL_REGEX)) {
    return scope.findOne({
      where: {
        urlId: id.match(URL_REGEX)[1],
      },
      ...options,
    });
  }
};

type SearchResult = {
  ranking: number,
  context: string,
  document: Document,
};

Document.searchForUser = async (
  user,
  query,
  options = {}
): Promise<SearchResult[]> => {
  const limit = options.limit || 15;
  const offset = options.offset || 0;
  const wildcardQuery = `${sequelize.escape(query)}:*`;

  // Ensure we're filtering by the users accessible collections. If
  // collectionId is passed as an option it is assumed that the authorization
  // has already been done in the router
  let collectionIds;
  if (options.collectionId) {
    collectionIds = [options.collectionId];
  } else {
    collectionIds = await user.collectionIds();
  }

  let dateFilter;
  if (options.dateFilter) {
    dateFilter = `1 ${options.dateFilter}`;
  }

  // Build the SQL query to get documentIds, ranking, and search term context
  const sql = `
  SELECT
    id,
    ts_rank(documents."searchVector", to_tsquery('english', :query)) as "searchRanking",
    ts_headline('english', "text", to_tsquery('english', :query), 'MaxFragments=1, MinWords=20, MaxWords=30') as "searchContext"
  FROM documents
  WHERE "searchVector" @@ to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "collectionId" IN(:collectionIds) AND
    ${
      options.dateFilter ? '"updatedAt" > now() - interval :dateFilter AND' : ''
    }
    ${
      options.collaboratorIds
        ? '"collaboratorIds" @> ARRAY[:collaboratorIds]::uuid[] AND'
        : ''
    }
    ${options.includeArchived ? '' : '"archivedAt" IS NULL AND'}
    "deletedAt" IS NULL AND
    ("publishedAt" IS NOT NULL OR "createdById" = :userId)
  ORDER BY 
    "searchRanking" DESC,
    "updatedAt" DESC
  LIMIT :limit
  OFFSET :offset;
`;

  const results = await sequelize.query(sql, {
    type: sequelize.QueryTypes.SELECT,
    replacements: {
      teamId: user.teamId,
      userId: user.id,
      collaboratorIds: options.collaboratorIds,
      query: wildcardQuery,
      limit,
      offset,
      collectionIds,
      dateFilter,
    },
  });

  // Final query to get associated document data
  const documents = await Document.scope({
    method: ['withViews', user.id],
  }).findAll({
    where: {
      id: map(results, 'id'),
    },
    include: [
      { model: Collection, as: 'collection' },
      { model: User, as: 'createdBy', paranoid: false },
      { model: User, as: 'updatedBy', paranoid: false },
    ],
  });

  return map(results, result => ({
    ranking: result.searchRanking,
    context: removeMarkdown(unescape(result.searchContext), {
      stripHTML: false,
    }),
    document: find(documents, { id: result.id }),
  }));
};

// Hooks

Document.addHook('beforeSave', async model => {
  if (!model.publishedAt) return;

  const collection = await Collection.findByPk(model.collectionId);
  if (!collection || collection.type !== 'atlas') return;

  await collection.updateDocument(model);
  model.collection = collection;
});

Document.addHook('afterCreate', async model => {
  if (!model.publishedAt) return;

  const collection = await Collection.findByPk(model.collectionId);
  if (!collection || collection.type !== 'atlas') return;

  await collection.addDocumentToStructure(model);
  model.collection = collection;

  return model;
});

// Instance methods

// Note: This method marks the document and it's children as deleted
// in the database, it does not permanantly delete them OR remove
// from the collection structure.
Document.prototype.deleteWithChildren = async function(options) {
  // Helper to destroy all child documents for a document
  const loopChildren = async (documentId, opts) => {
    const childDocuments = await Document.findAll({
      where: { parentDocumentId: documentId },
    });
    childDocuments.forEach(async child => {
      await loopChildren(child.id, opts);
      await child.destroy(opts);
    });
  };

  await loopChildren(this.id, options);
  await this.destroy(options);
};

Document.prototype.archiveWithChildren = async function(userId, options) {
  const archivedAt = new Date();

  // Helper to archive all child documents for a document
  const archiveChildren = async parentDocumentId => {
    const childDocuments = await Document.findAll({
      where: { parentDocumentId },
    });
    childDocuments.forEach(async child => {
      await archiveChildren(child.id);

      child.archivedAt = archivedAt;
      child.lastModifiedById = userId;
      await child.save(options);
    });
  };

  await archiveChildren(this.id);
  this.archivedAt = archivedAt;
  this.lastModifiedById = userId;
  return this.save(options);
};

Document.prototype.publish = async function(options) {
  if (this.publishedAt) return this.save(options);

  const collection = await Collection.findByPk(this.collectionId);
  if (collection.type !== 'atlas') return this.save(options);

  await collection.addDocumentToStructure(this);

  this.publishedAt = new Date();
  await this.save(options);
  this.collection = collection;

  return this;
};

// Moves a document from being visible to the team within a collection
// to the archived area, where it can be subsequently restored.
Document.prototype.archive = async function(userId) {
  // archive any children and remove from the document structure
  const collection = await this.getCollection();
  await collection.removeDocumentInStructure(this);
  this.collection = collection;

  await this.archiveWithChildren(userId);

  return this;
};

// Restore an archived document back to being visible to the team
Document.prototype.unarchive = async function(userId) {
  const collection = await this.getCollection();

  // check to see if the documents parent hasn't been archived also
  // If it has then restore the document to the collection root.
  if (this.parentDocumentId) {
    const parent = await Document.findOne({
      where: {
        id: this.parentDocumentId,
        archivedAt: {
          [Op.eq]: null,
        },
      },
    });
    if (!parent) this.parentDocumentId = undefined;
  }

  await collection.addDocumentToStructure(this);
  this.collection = collection;

  this.archivedAt = null;
  this.lastModifiedById = userId;
  await this.save();

  return this;
};

// Delete a document, archived or otherwise.
Document.prototype.delete = function(options) {
  return sequelize.transaction(async (transaction: Transaction): Promise<*> => {
    if (!this.archivedAt) {
      // delete any children and remove from the document structure
      const collection = await this.getCollection();
      if (collection) await collection.deleteDocument(this, { transaction });
    }

    await Revision.destroy({
      where: { documentId: this.id },
      transaction,
    });

    await this.destroy({ transaction, ...options });

    return this;
  });
};

Document.prototype.getTimestamp = function() {
  return Math.round(new Date(this.updatedAt).getTime() / 1000);
};

Document.prototype.getSummary = function() {
  const value = Markdown.deserialize(this.text);
  const plain = Plain.serialize(value);
  const lines = compact(plain.split('\n'));
  return lines.length >= 1 ? lines[1] : '';
};

Document.prototype.toJSON = function() {
  // Warning: only use for new documents as order of children is
  // handled in the collection's documentStructure
  return {
    id: this.id,
    title: this.title,
    url: this.url,
    children: [],
  };
};

export default Document;
