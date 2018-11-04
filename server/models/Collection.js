// @flow
import _ from 'lodash';
import slug from 'slug';
import randomstring from 'randomstring';
import { DataTypes, sequelize } from '../sequelize';
import { asyncLock } from '../redis';
import events from '../events';
import Document from './Document';
import Event from './Event';
import { welcomeMessage } from '../utils/onboarding';

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
    color: DataTypes.STRING,
    type: {
      type: DataTypes.STRING,
      validate: { isIn: allowedCollectionTypes },
    },
    creatorId: DataTypes.UUID,

    /* type: atlas */
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
            collectionId: collection.id,
            teamId: collection.teamId,
            userId: collection.creatorId,
            lastModifiedById: collection.creatorId,
            createdById: collection.creatorId,
            publishedAt: new Date(),
            title: 'Welcome to Outline',
            text: welcomeMessage(collection.id),
          });
          collection.documentStructure = [document.toJSON()];
        } else {
          // Let user create first document
          collection.documentStructure = [];
        }
        await collection.save();
      },
    },
    getterMethods: {
      url() {
        return `/collections/${this.id}`;
      },
    },
  }
);

// Class methods

Collection.associate = models => {
  Collection.hasMany(models.Document, {
    as: 'documents',
    foreignKey: 'collectionId',
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

Collection.addHook('afterDestroy', async model => {
  await Document.destroy({
    where: {
      collectionId: model.id,
    },
  });
});

// Hooks

Collection.addHook('afterCreate', model =>
  events.add({ name: 'collections.create', model })
);

Collection.addHook('afterDestroy', model =>
  events.add({ name: 'collections.delete', model })
);

Collection.addHook('afterUpdate', model =>
  events.add({ name: 'collections.update', model })
);

// Instance methods

Collection.prototype.addDocumentToStructure = async function(
  document,
  index,
  options = {}
) {
  if (!this.documentStructure) return;
  const existingData = {
    old: this.documentStructure,
    documentId: document,
    parentDocumentId: document.parentDocumentId,
    index,
  };

  // documentStructure can only be updated by one request at the time
  const unlock = await asyncLock(`collection-${this.id}`);

  // If moving existing document with children, use existing structure to
  // keep everything in shape and not loose documents
  const documentJson = {
    ...document.toJSON(),
    ...options.documentJson,
  };

  if (!document.parentDocumentId) {
    // Note: Index is supported on DB level but it's being ignored
    // by the API presentation until we build product support for it.
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

  await Event.create({
    name: 'Collection#addDocumentToStructure',
    data: {
      ...existingData,
      new: this.documentStructure,
    },
    collectionId: this.id,
    teamId: this.teamId,
  });

  unlock();

  return this;
};

/**
 * Update document's title and url in the documentStructure
 */
Collection.prototype.updateDocument = async function(updatedDocument) {
  if (!this.documentStructure) return;

  // documentStructure can only be updated by one request at the time
  const unlock = await asyncLock(`collection-${this.id}`);

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
  unlock();
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

  // documentStructure can only be updated by one request at the time
  const unlock = await asyncLock('testLock');

  const existingData = {
    old: this.documentStructure,
    documentId: document,
    parentDocumentId: document.parentDocumentId,
    options,
  };

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
        if (childDocument) await childDocument.destroy();
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

  await Event.create({
    name: 'Collection#removeDocument',
    data: {
      ...existingData,
      new: this.documentStructure,
    },
    collectionId: this.id,
    teamId: this.teamId,
  });

  await unlock();

  return returnValue;
};

export default Collection;
