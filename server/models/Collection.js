// @flow
import { find, remove } from 'lodash';
import slug from 'slug';
import randomstring from 'randomstring';
import { DataTypes, sequelize } from '../sequelize';
import { asyncLock } from '../redis';
import events from '../events';
import Document from './Document';
import CollectionUser from './CollectionUser';
import { welcomeMessage } from '../utils/onboarding';

slug.defaults.mode = 'rfc3986';

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
    private: DataTypes.BOOLEAN,
    type: {
      type: DataTypes.STRING,
      validate: { isIn: [['atlas', 'journal']] },
    },

    /* type: atlas */
    documentStructure: DataTypes.JSONB,
  },
  {
    tableName: 'collections',
    paranoid: true,
    hooks: {
      beforeValidate: (collection: Collection) => {
        collection.urlId = collection.urlId || randomstring.generate(10);
      },
      afterCreate: async (collection: Collection) => {
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
  Collection.belongsToMany(models.User, {
    as: 'users',
    through: models.CollectionUser,
    foreignKey: 'collectionId',
  });
  Collection.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'creatorId',
  });
  Collection.belongsTo(models.Team, {
    as: 'team',
  });
  Collection.addScope(
    'defaultScope',
    {
      include: [
        {
          model: models.User,
          as: 'users',
          through: 'collection_users',
          paranoid: false,
        },
      ],
    },
    { override: true }
  );
};

Collection.addHook('afterDestroy', async (model: Collection) => {
  await Document.destroy({
    where: {
      collectionId: model.id,
    },
  });
});

Collection.addHook('afterCreate', (model: Collection) =>
  events.add({ name: 'collections.create', model })
);

Collection.addHook('afterDestroy', (model: Collection) =>
  events.add({ name: 'collections.delete', model })
);

Collection.addHook('afterUpdate', (model: Collection) =>
  events.add({ name: 'collections.update', model })
);

Collection.addHook('afterCreate', (model: Collection, options) => {
  if (model.private) {
    return CollectionUser.findOrCreate({
      where: {
        collectionId: model.id,
        userId: model.creatorId,
      },
      defaults: {
        permission: 'read_write',
        createdById: model.creatorId,
      },
      transaction: options.transaction,
    });
  }
});

// Instance methods

Collection.prototype.addDocumentToStructure = async function(
  document: Document,
  index: number,
  options = {}
) {
  if (!this.documentStructure) return;

  // documentStructure can only be updated by one request at a time
  const unlock = await asyncLock(`collection-${this.id}`);

  // If moving existing document with children, use existing structure
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
  await this.save(options);
  unlock();

  return this;
};

/**
 * Update document's title and url in the documentStructure
 */
Collection.prototype.updateDocument = async function(
  updatedDocument: Document
) {
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

  const documentJson = await this.removeDocumentInStructure(document);
  await this.addDocumentToStructure(document, index, { documentJson });
};

Collection.prototype.deleteDocument = async function(document) {
  await this.removeDocumentInStructure(document, { save: true });
  await document.deleteWithChildren();
};

Collection.prototype.removeDocumentInStructure = async function(
  document,
  options?: { save?: boolean }
) {
  if (!this.documentStructure) return;
  let returnValue;
  let unlock;

  if (options && options.save) {
    // documentStructure can only be updated by one request at the time
    unlock = await asyncLock(`collection-${this.id}`);
  }

  const removeFromChildren = async (children, id) => {
    children = await Promise.all(
      children.map(async childDocument => {
        return {
          ...childDocument,
          children: await removeFromChildren(childDocument.children, id),
        };
      })
    );

    const match = find(children, { id });
    if (match) {
      if (!returnValue) returnValue = match;
      remove(children, { id });
    }

    return children;
  };

  this.documentStructure = await removeFromChildren(
    this.documentStructure,
    document.id
  );

  if (options && options.save) {
    await this.save(options);
    if (unlock) await unlock();
  }

  return returnValue;
};

export default Collection;
