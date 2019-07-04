// @flow
import { find, remove } from 'lodash';
import slug from 'slug';
import randomstring from 'randomstring';
import { DataTypes, sequelize } from '../sequelize';
import Document from './Document';
import CollectionUser from './CollectionUser';

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
  if (!this.documentStructure) {
    this.documentStructure = [];
  }

  let transaction;

  try {
    // documentStructure can only be updated by one request at a time
    if (options.save !== false) {
      transaction = await sequelize.transaction();
    }

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

    if (options.save !== false) {
      await this.save({
        ...options,
        transaction,
      });
      if (transaction) {
        await transaction.commit();
      }
    }
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }

  return this;
};

/**
 * Update document's title and url in the documentStructure
 */
Collection.prototype.updateDocument = async function(
  updatedDocument: Document
) {
  if (!this.documentStructure) return;

  let transaction;

  try {
    // documentStructure can only be updated by one request at the time
    transaction = await sequelize.transaction();

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
    await this.save({ transaction });
    await transaction.commit();
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }

  return this;
};

Collection.prototype.deleteDocument = async function(document) {
  await this.removeDocumentInStructure(document);
  await document.deleteWithChildren();
};

Collection.prototype.removeDocumentInStructure = async function(
  document,
  options
) {
  if (!this.documentStructure) return;
  let returnValue;
  let transaction;

  try {
    // documentStructure can only be updated by one request at the time
    transaction = await sequelize.transaction();

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

    await this.save({
      ...options,
      transaction,
    });
    await transaction.commit();
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }

  return returnValue;
};

export default Collection;
