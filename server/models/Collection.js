// @flow
import slug from 'slug';
import randomstring from 'randomstring';
import { DataTypes, sequelize } from '../sequelize';
import Document from './Document';
import _ from 'lodash';

// $FlowIssue invalid flow-typed
slug.defaults.mode = 'rfc3986';

const allowedCollectionTypes = [['atlas', 'journal']];

const Collection = sequelize.define(
  'collection',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    urlId: { type: DataTypes.STRING, unique: true },
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    type: {
      type: DataTypes.STRING,
      validate: { isIn: allowedCollectionTypes },
    },
    creatorId: DataTypes.UUID,

    /* type: atlas */
    navigationTree: DataTypes.JSONB, // legacy
    documentStructure: DataTypes.JSONB,
  },
  {
    tableName: 'collections',
    paranoid: true,
    hooks: {
      beforeValidate: collection => {
        collection.urlId = collection.urlId || randomstring.generate(10);
      },
      afterCreate: async collection => {
        const team = await collection.getTeam();
        const collections = await team.getCollections();

        // Don't auto-create for journal types, yet
        if (collection.type !== 'atlas') return;

        if (collections.length < 2) {
          // Create intro document if first collection for team
          const document = await Document.create({
            parentDocumentId: null,
            atlasId: collection.id,
            teamId: collection.teamId,
            userId: collection.creatorId,
            lastModifiedById: collection.creatorId,
            createdById: collection.creatorId,
            title: 'Introduction',
            text: '# Introduction\n\nLets get started...',
          });
          collection.documentStructure = [document.toJSON()];
        } else {
          // Let user create first document
          collection.documentStructure = [];
        }
        await collection.save();
      },
    },
  }
);

// Class methods

Collection.associate = models => {
  Collection.hasMany(models.Document, {
    as: 'documents',
    foreignKey: 'atlasId',
    onDelete: 'cascade',
  });
  Collection.belongsTo(models.Team, {
    as: 'team',
  });
  Collection.addScope('withRecentDocuments', {
    include: [
      {
        as: 'documents',
        limit: 10,
        model: models.Document,
        order: [['updatedAt', 'DESC']],
      },
    ],
  });
};

// Instance methods

Collection.prototype.getUrl = function() {
  return `/collections/${this.id}`;
};

Collection.prototype.getDocumentsStructure = async function() {
  // Lazy fill this.documentStructure - TMP for internal release
  if (!this.documentStructure) {
    this.documentStructure = this.navigationTree.children;

    // Remove parent references from all root documents
    await this.navigationTree.children.forEach(async ({ id }) => {
      const document = await Document.findById(id);
      document.parentDocumentId = null;
      await document.save();
    });

    // Remove root document
    const rootDocument = await Document.findById(this.navigationTree.id);
    await rootDocument.destroy();

    await this.save();
  }

  return this.documentStructure;
};

Collection.prototype.addDocumentToStructure = async function(
  document,
  index,
  options = {}
) {
  if (!this.documentStructure) return;

  // If moving existing document with children, use existing structure to
  // keep everything in shape and not loose documents
  const documentJson = {
    ...document.toJSON(),
    ...options.documentJson,
  };

  if (!document.parentDocumentId) {
    this.documentStructure.splice(
      index !== undefined ? index : this.documentStructure.length,
      0,
      documentJson
    );
  } else {
    // Recursively place document
    const placeDocument = documentList => {
      return documentList.map(childDocument => {
        if (document.parentDocumentId === childDocument.id) {
          childDocument.children.splice(
            index !== undefined ? index : childDocument.children.length,
            0,
            documentJson
          );
        } else {
          childDocument.children = placeDocument(childDocument.children);
        }

        return childDocument;
      });
    };
    this.documentStructure = placeDocument(this.documentStructure);
  }

  // Sequelize doesn't seem to set the value with splice on JSONB field
  this.documentStructure = this.documentStructure;
  await this.save();

  return this;
};

/**
 * Update document's title and url in the documentStructure
 */
Collection.prototype.updateDocument = async function(updatedDocument) {
  if (!this.documentStructure) return;
  const { id } = updatedDocument;

  const updateChildren = documents => {
    return documents.map(document => {
      if (document.id === id) {
        document = {
          ...updatedDocument.toJSON(),
          children: document.children,
        };
      } else {
        document.children = updateChildren(document.children);
      }
      return document;
    });
  };

  this.documentStructure = updateChildren(this.documentStructure);
  await this.save();
  return this;
};

/**
 * moveDocument is combination of removing the document from the structure
 * and placing it back the the new location with the existing children.
 */
Collection.prototype.moveDocument = async function(document, index) {
  if (!this.documentStructure) return;

  const documentJson = await this.removeDocument(document, {
    deleteDocument: false,
  });
  await this.addDocumentToStructure(document, index, { documentJson });

  return this;
};

type DeleteDocumentOptions = {
  deleteDocument: boolean,
};

/**
 * removeDocument is used for both deleting documents (deleteDocument: true)
 * and removing them temporarily from the structure while they are being moved
 * (deleteDocument: false).
 */
Collection.prototype.removeDocument = async function(
  document,
  options: DeleteDocumentOptions = { deleteDocument: true }
) {
  if (!this.documentStructure) return;
  let returnValue;

  // Helper to destroy all child documents for a document
  const deleteChildren = async documentId => {
    const childDocuments = await Document.findAll({
      where: { parentDocumentId: documentId },
    });
    childDocuments.forEach(async child => {
      await deleteChildren(child.id);
      await child.destroy();
    });
  };

  // Prune, and destroy if needed, from the document structure
  const deleteFromChildren = async (children, id) => {
    children = await Promise.all(
      children.map(async childDocument => {
        return {
          ...childDocument,
          children: await deleteFromChildren(childDocument.children, id),
        };
      })
    );

    const match = _.find(children, { id });
    if (match) {
      if (!options.deleteDocument && !returnValue) returnValue = match;
      _.remove(children, { id });

      if (options.deleteDocument) {
        const childDocument = await Document.findById(id);
        // Delete the actual document
        await childDocument.destroy();
        // Delete all child documents
        await deleteChildren(id);
      }
    }

    return children;
  };

  this.documentStructure = await deleteFromChildren(
    this.documentStructure,
    document.id
  );

  if (options.deleteDocument) await this.save();
  return returnValue;
};

export default Collection;
