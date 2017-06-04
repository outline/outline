// @flow
import slug from 'slug';
import randomstring from 'randomstring';
import { DataTypes, sequelize } from '../sequelize';
import _ from 'lodash';
import Document from './Document';

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
        if (collection.type !== 'atlas') return;

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
        collection.documentStructure = [
          {
            ...document.toJSON(),
            children: [],
          },
        ];
        await collection.save();
      },
    },
    instanceMethods: {
      getUrl() {
        // const slugifiedName = slug(this.name);
        // return `/${slugifiedName}-c${this.urlId}`;
        return `/collections/${this.id}`;
      },

      async getDocumentsStructure() {
        // Lazy fill this.documentStructure
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
      },

      async addDocument(document, parentDocumentId, index) {
        if (!parentDocumentId) {
          this.documentStructure.splice(index, 0, document.toJSON());
        } else {
          this.documentStructure = this.documentStructure.forEach(doc => {
            if (parentDocumentId === document) {
              return doc.children.splice(index, 0, document.toJSON());
            }
          });
        }

        return this.documentStructure;
      },

      async updateDocument(document) {
        // Update document info in this.documents
      },
      // async deleteDocument(document) {
      //   const deleteNodeAndDocument = async (
      //     node,
      //     documentId,
      //     shouldDelete = false
      //   ) => {
      //     // Delete node if id matches
      //     if (document.id === node.id) shouldDelete = true;

      //     const newChildren = [];
      //     node.children.forEach(async childNode => {
      //       const child = await deleteNodeAndDocument(
      //         childNode,
      //         documentId,
      //         shouldDelete
      //       );
      //       if (child) newChildren.push(child);
      //     });
      //     node.children = newChildren;

      //     if (shouldDelete) {
      //       const doc = await Document.findById(node.id);
      //       await doc.destroy();
      //     }

      //     return shouldDelete ? null : node;
      //   };

      //   this.navigationTree = await deleteNodeAndDocument(
      //     this.navigationTree,
      //     document.id
      //   );
      // },
    },
  }
);

Collection.hasMany(Document, { as: 'documents', foreignKey: 'atlasId' });

export default Collection;
