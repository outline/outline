// @flow
import removeMarkdown from "@tommoor/remove-markdown";
import { compact, find, map, uniq } from "lodash";
import randomstring from "randomstring";
import Sequelize, { Transaction } from "sequelize";
import MarkdownSerializer from "slate-md-serializer";
import isUUID from "validator/lib/isUUID";
import parseTitle from "../../shared/utils/parseTitle";
import unescape from "../../shared/utils/unescape";
import { Collection, User } from "../models";
import { DataTypes, sequelize } from "../sequelize";
import slugify from "../utils/slugify";
import Revision from "./Revision";

const Op = Sequelize.Op;
const URL_REGEX = /^[0-9a-zA-Z-_~]*-([a-zA-Z0-9]{10,15})$/;
const serializer = new MarkdownSerializer();

export const DOCUMENT_VERSION = 2;

const createRevision = async (doc, options = {}) => {
  // we don't create revisions for autosaves
  if (options.autosave) return;

  const previous = await Revision.findLatest(doc.id);

  // we don't create revisions if identical to previous
  if (previous && doc.text === previous.text && doc.title === previous.title) {
    return;
  }

  return Revision.create(
    {
      title: doc.title,
      text: doc.text,
      userId: doc.lastModifiedById,
      editorVersion: doc.editorVersion,
      version: doc.version,
      documentId: doc.id,
    },
    {
      transaction: options.transaction,
    }
  );
};

const createUrlId = (doc) => {
  return (doc.urlId = doc.urlId || randomstring.generate(10));
};

const beforeCreate = async (doc) => {
  if (doc.version === undefined) {
    doc.version = DOCUMENT_VERSION;
  }
  return beforeSave(doc);
};

const beforeSave = async (doc) => {
  const { emoji } = parseTitle(doc.text);

  // emoji in the title is split out for easier display
  doc.emoji = emoji;

  // ensure documents have a title
  doc.title = doc.title || "";

  // add the current user as a collaborator on this doc
  if (!doc.collaboratorIds) doc.collaboratorIds = [];
  doc.collaboratorIds = uniq(doc.collaboratorIds.concat(doc.lastModifiedById));

  // increment revision
  doc.revisionCount += 1;

  return doc;
};

const Document = sequelize.define(
  "document",
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
          msg: "Document title must be less than 100 characters",
        },
      },
    },
    version: DataTypes.SMALLINT,
    template: DataTypes.BOOLEAN,
    editorVersion: DataTypes.STRING,
    text: DataTypes.TEXT,

    // backup contains a record of text at the moment it was converted to v2
    // this is a safety measure during deployment of new editor and will be
    // dropped in a future update
    backup: DataTypes.TEXT,
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
      beforeCreate: beforeCreate,
      beforeUpdate: beforeSave,
      afterCreate: createRevision,
      afterUpdate: createRevision,
    },
    getterMethods: {
      url: function () {
        const slugifiedTitle = slugify(this.title);
        return `/doc/${slugifiedTitle}-${this.urlId}`;
      },
    },
  }
);

// Class methods

Document.associate = (models) => {
  Document.belongsTo(models.Collection, {
    as: "collection",
    foreignKey: "collectionId",
    onDelete: "cascade",
  });
  Document.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
  Document.belongsTo(models.Document, {
    as: "document",
    foreignKey: "templateId",
  });
  Document.belongsTo(models.User, {
    as: "createdBy",
    foreignKey: "createdById",
  });
  Document.belongsTo(models.User, {
    as: "updatedBy",
    foreignKey: "lastModifiedById",
  });
  Document.belongsTo(models.User, {
    as: "pinnedBy",
    foreignKey: "pinnedById",
  });
  Document.hasMany(models.Revision, {
    as: "revisions",
    onDelete: "cascade",
  });
  Document.hasMany(models.Backlink, {
    as: "backlinks",
    onDelete: "cascade",
  });
  Document.hasMany(models.Star, {
    as: "starred",
    onDelete: "cascade",
  });
  Document.hasMany(models.View, {
    as: "views",
  });
  Document.addScope("defaultScope", {
    include: [
      { model: models.User, as: "createdBy", paranoid: false },
      { model: models.User, as: "updatedBy", paranoid: false },
    ],
    where: {
      publishedAt: {
        [Op.ne]: null,
      },
    },
  });
  Document.addScope("withCollection", (userId) => {
    if (userId) {
      return {
        include: [
          {
            model: models.Collection.scope({
              method: ["withMembership", userId],
            }),
            as: "collection",
          },
        ],
      };
    }

    return {
      include: [{ model: models.Collection, as: "collection" }],
    };
  });
  Document.addScope("withUnpublished", {
    include: [
      { model: models.User, as: "createdBy", paranoid: false },
      { model: models.User, as: "updatedBy", paranoid: false },
    ],
  });
  Document.addScope("withViews", (userId) => ({
    include: [
      { model: models.View, as: "views", where: { userId }, required: false },
    ],
  }));
  Document.addScope("withStarred", (userId) => ({
    include: [
      { model: models.Star, as: "starred", where: { userId }, required: false },
    ],
  }));
};

Document.findByPk = async function (id, options = {}) {
  // allow default preloading of collection membership if `userId` is passed in find options
  // almost every endpoint needs the collection membership to determine policy permissions.
  const scope = this.scope("withUnpublished", {
    method: ["withCollection", options.userId],
  });

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

type SearchResponse = {
  results: {
    ranking: number,
    context: string,
    document: Document,
  }[],
  totalCount: number,
};

type SearchOptions = {
  limit?: number,
  offset?: number,
  collectionId?: string,
  dateFilter?: "day" | "week" | "month" | "year",
  collaboratorIds?: string[],
  includeArchived?: boolean,
  includeDrafts?: boolean,
};

function escape(query: string): string {
  // replace "\" with escaped "\\" because sequelize.escape doesn't do it
  // https://github.com/sequelize/sequelize/issues/2950
  return sequelize.escape(query).replace("\\", "\\\\");
}

Document.searchForTeam = async (
  team,
  query,
  options: SearchOptions = {}
): Promise<SearchResponse> => {
  const limit = options.limit || 15;
  const offset = options.offset || 0;
  const wildcardQuery = `${escape(query)}:*`;
  const collectionIds = await team.collectionIds();

  // If the team has access no public collections then shortcircuit the rest of this
  if (!collectionIds.length) {
    return { results: [], totalCount: 0 };
  }

  // Build the SQL query to get documentIds, ranking, and search term context
  const whereClause = `
  "searchVector" @@ to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "collectionId" IN(:collectionIds) AND
    "deletedAt" IS NULL AND
    "publishedAt" IS NOT NULL
  `;

  const selectSql = `
    SELECT
      id,
      ts_rank(documents."searchVector", to_tsquery('english', :query)) as "searchRanking",
      ts_headline('english', "text", to_tsquery('english', :query), 'MaxFragments=1, MinWords=20, MaxWords=30') as "searchContext"
    FROM documents
    WHERE ${whereClause}
    ORDER BY
      "searchRanking" DESC,
      "updatedAt" DESC
    LIMIT :limit
    OFFSET :offset;
  `;

  const countSql = `
    SELECT COUNT(id)
    FROM documents
    WHERE ${whereClause}
  `;

  const queryReplacements = {
    teamId: team.id,
    query: wildcardQuery,
    collectionIds,
  };

  const resultsQuery = sequelize.query(selectSql, {
    type: sequelize.QueryTypes.SELECT,
    replacements: {
      ...queryReplacements,
      limit,
      offset,
    },
  });

  const countQuery = sequelize.query(countSql, {
    type: sequelize.QueryTypes.SELECT,
    replacements: queryReplacements,
  });

  const [results, [{ count }]] = await Promise.all([resultsQuery, countQuery]);

  // Final query to get associated document data
  const documents = await Document.findAll({
    where: {
      id: map(results, "id"),
    },
    include: [
      { model: Collection, as: "collection" },
      { model: User, as: "createdBy", paranoid: false },
      { model: User, as: "updatedBy", paranoid: false },
    ],
  });

  return {
    results: map(results, (result) => ({
      ranking: result.searchRanking,
      context: removeMarkdown(unescape(result.searchContext), {
        stripHTML: false,
      }),
      document: find(documents, { id: result.id }),
    })),
    totalCount: count,
  };
};

Document.searchForUser = async (
  user,
  query,
  options: SearchOptions = {}
): Promise<SearchResponse> => {
  const limit = options.limit || 15;
  const offset = options.offset || 0;
  const wildcardQuery = `${escape(query)}:*`;

  // Ensure we're filtering by the users accessible collections. If
  // collectionId is passed as an option it is assumed that the authorization
  // has already been done in the router
  let collectionIds;
  if (options.collectionId) {
    collectionIds = [options.collectionId];
  } else {
    collectionIds = await user.collectionIds();
  }

  // If the user has access to no collections then shortcircuit the rest of this
  if (!collectionIds.length) {
    return { results: [], totalCount: 0 };
  }

  let dateFilter;
  if (options.dateFilter) {
    dateFilter = `1 ${options.dateFilter}`;
  }

  // Build the SQL query to get documentIds, ranking, and search term context
  const whereClause = `
  "searchVector" @@ to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "collectionId" IN(:collectionIds) AND
    ${
      options.dateFilter ? '"updatedAt" > now() - interval :dateFilter AND' : ""
    }
    ${
      options.collaboratorIds
        ? '"collaboratorIds" @> ARRAY[:collaboratorIds]::uuid[] AND'
        : ""
    }
    ${options.includeArchived ? "" : '"archivedAt" IS NULL AND'}
    "deletedAt" IS NULL AND
    ${
      options.includeDrafts
        ? '("publishedAt" IS NOT NULL OR "createdById" = :userId)'
        : '"publishedAt" IS NOT NULL'
    }
  `;

  const selectSql = `
  SELECT
    id,
    ts_rank(documents."searchVector", to_tsquery('english', :query)) as "searchRanking",
    ts_headline('english', "text", to_tsquery('english', :query), 'MaxFragments=1, MinWords=20, MaxWords=30') as "searchContext"
  FROM documents
  WHERE ${whereClause}
  ORDER BY
    "searchRanking" DESC,
    "updatedAt" DESC
  LIMIT :limit
  OFFSET :offset;
  `;

  const countSql = `
    SELECT COUNT(id)
    FROM documents
    WHERE ${whereClause}
  `;

  const queryReplacements = {
    teamId: user.teamId,
    userId: user.id,
    collaboratorIds: options.collaboratorIds,
    query: wildcardQuery,
    collectionIds,
    dateFilter,
  };

  const resultsQuery = sequelize.query(selectSql, {
    type: sequelize.QueryTypes.SELECT,
    replacements: {
      ...queryReplacements,
      limit,
      offset,
    },
  });

  const countQuery = sequelize.query(countSql, {
    type: sequelize.QueryTypes.SELECT,
    replacements: queryReplacements,
  });

  const [results, [{ count }]] = await Promise.all([resultsQuery, countQuery]);
  // Final query to get associated document data
  const documents = await Document.scope(
    {
      method: ["withViews", user.id],
    },
    {
      method: ["withCollection", user.id],
    }
  ).findAll({
    where: {
      id: map(results, "id"),
    },
    include: [
      { model: User, as: "createdBy", paranoid: false },
      { model: User, as: "updatedBy", paranoid: false },
    ],
  });

  return {
    results: map(results, (result) => ({
      ranking: result.searchRanking,
      context: removeMarkdown(unescape(result.searchContext), {
        stripHTML: false,
      }),
      document: find(documents, { id: result.id }),
    })),
    totalCount: count,
  };
};

// Hooks

Document.addHook("beforeSave", async (model) => {
  if (!model.publishedAt || model.template) {
    return;
  }

  const collection = await Collection.findByPk(model.collectionId);
  if (!collection) {
    return;
  }

  await collection.updateDocument(model);
  model.collection = collection;
});

Document.addHook("afterCreate", async (model) => {
  if (!model.publishedAt || model.template) {
    return;
  }

  const collection = await Collection.findByPk(model.collectionId);
  if (!collection) {
    return;
  }

  await collection.addDocumentToStructure(model);
  model.collection = collection;

  return model;
});

// Instance methods

Document.prototype.toMarkdown = function () {
  const text = unescape(this.text);

  if (this.version) {
    return `# ${this.title}\n\n${text}`;
  }

  return text;
};

Document.prototype.migrateVersion = function () {
  let migrated = false;

  // migrate from document version 0 -> 1
  if (!this.version) {
    // removing the title from the document text attribute
    this.text = this.text.replace(/^#\s(.*)\n/, "");
    this.version = 1;
    migrated = true;
  }

  // migrate from document version 1 -> 2
  if (this.version === 1) {
    const nodes = serializer.deserialize(this.text);
    this.backup = this.text;
    this.text = serializer.serialize(nodes, { version: 2 });
    this.version = 2;
    migrated = true;
  }

  if (migrated) {
    return this.save({ silent: true, hooks: false });
  }
};

// Note: This method marks the document and it's children as deleted
// in the database, it does not permanently delete them OR remove
// from the collection structure.
Document.prototype.deleteWithChildren = async function (options) {
  // Helper to destroy all child documents for a document
  const loopChildren = async (documentId, opts) => {
    const childDocuments = await Document.findAll({
      where: { parentDocumentId: documentId },
    });
    childDocuments.forEach(async (child) => {
      await loopChildren(child.id, opts);
      await child.destroy(opts);
    });
  };

  await loopChildren(this.id, options);
  await this.destroy(options);
};

Document.prototype.archiveWithChildren = async function (userId, options) {
  const archivedAt = new Date();

  // Helper to archive all child documents for a document
  const archiveChildren = async (parentDocumentId) => {
    const childDocuments = await Document.findAll({
      where: { parentDocumentId },
    });
    childDocuments.forEach(async (child) => {
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

Document.prototype.publish = async function (options) {
  if (this.publishedAt) return this.save(options);

  const collection = await Collection.findByPk(this.collectionId);
  await collection.addDocumentToStructure(this);

  this.publishedAt = new Date();
  await this.save(options);

  return this;
};

Document.prototype.unpublish = async function (options) {
  if (!this.publishedAt) return this;

  const collection = await this.getCollection();
  await collection.removeDocumentInStructure(this);

  this.publishedAt = null;
  await this.save(options);

  return this;
};

// Moves a document from being visible to the team within a collection
// to the archived area, where it can be subsequently restored.
Document.prototype.archive = async function (userId) {
  // archive any children and remove from the document structure
  const collection = await this.getCollection();
  await collection.removeDocumentInStructure(this);
  this.collection = collection;

  await this.archiveWithChildren(userId);

  return this;
};

// Restore an archived document back to being visible to the team
Document.prototype.unarchive = async function (userId: string) {
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

  if (this.deletedAt) {
    await this.restore();
  }

  this.archivedAt = null;
  this.lastModifiedById = userId;
  await this.save();

  return this;
};

// Delete a document, archived or otherwise.
Document.prototype.delete = function (userId: string) {
  return sequelize.transaction(
    async (transaction: Transaction): Promise<Document> => {
      if (!this.archivedAt && !this.template) {
        // delete any children and remove from the document structure
        const collection = await this.getCollection();
        if (collection) await collection.deleteDocument(this, { transaction });
      }

      await Revision.destroy({
        where: { documentId: this.id },
        transaction,
      });

      this.lastModifiedById = userId;
      this.deletedAt = new Date();

      await this.save({ transaction });
      return this;
    }
  );
};

Document.prototype.getTimestamp = function () {
  return Math.round(new Date(this.updatedAt).getTime() / 1000);
};

Document.prototype.getSummary = function () {
  const plain = removeMarkdown(unescape(this.text), {
    stripHTML: false,
  });
  const lines = compact(plain.split("\n"));
  const notEmpty = lines.length >= 1;

  if (this.version) {
    return notEmpty ? lines[0] : "";
  }

  return notEmpty ? lines[1] : "";
};

Document.prototype.toJSON = function () {
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
