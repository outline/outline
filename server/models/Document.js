// @flow
import slug from 'slug';
import _ from 'lodash';
import randomstring from 'randomstring';

import isUUID from 'validator/lib/isUUID';
import { DataTypes, sequelize } from '../sequelize';
import { convertToMarkdown } from '../../frontend/utils/markdown';
import { truncateMarkdown } from '../utils/truncate';
import Revision from './Revision';

const URL_REGEX = /^[a-zA-Z0-9-]*-([a-zA-Z0-9]{10,15})$/;

// $FlowIssue invalid flow-typed
slug.defaults.mode = 'rfc3986';
const slugify = text =>
  slug(text, {
    remove: /[.]/g,
  });

const createRevision = doc => {
  // Create revision of the current (latest)
  return Revision.create({
    title: doc.title,
    text: doc.text,
    html: doc.html,
    preview: doc.preview,
    userId: doc.lastModifiedById,
    documentId: doc.id,
  });
};

const createUrlId = doc => {
  return (doc.urlId = doc.urlId || randomstring.generate(10));
};

const beforeSave = async doc => {
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
      beforeValidate: createUrlId,
      beforeCreate: beforeSave,
      beforeUpdate: beforeSave,
      afterCreate: createRevision,
      afterUpdate: createRevision,
    },
    instanceMethods: {
      getUrl() {
        const slugifiedTitle = slugify(this.title);
        return `/doc/${slugifiedTitle}-${this.urlId}`;
      },
      toJSON() {
        // Warning: only use for new documents as order of children is
        // handled in the collection's documentStructure
        return {
          id: this.id,
          title: this.title,
          url: this.getUrl(),
          children: [],
        };
      },
    },
    classMethods: {
      associate: models => {
        Document.belongsTo(models.Collection, {
          as: 'collection',
          foreignKey: 'atlasId',
        });
        Document.belongsTo(models.User, {
          as: 'createdBy',
          foreignKey: 'createdById',
        });
        Document.belongsTo(models.User, {
          as: 'updatedBy',
          foreignKey: 'lastModifiedById',
        });
        Document.hasMany(models.Star, {
          as: 'starred',
        });
        Document.addScope(
          'defaultScope',
          {
            include: [
              { model: models.Collection, as: 'collection' },
              { model: models.User, as: 'createdBy' },
              { model: models.User, as: 'updatedBy' },
            ],
          },
          { override: true }
        );
      },
      findById: async id => {
        if (isUUID(id)) {
          return Document.findOne({
            where: { id },
          });
        } else if (id.match(URL_REGEX)) {
          return Document.findOne({
            where: {
              urlId: id.match(URL_REGEX)[1],
            },
          });
        }
      },
      searchForUser: (user, query, options = {}) => {
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

        return sequelize.query(sql, {
          replacements: {
            query,
            limit,
            offset,
          },
          model: Document,
        });
      },
    },
  }
);

export default Document;
