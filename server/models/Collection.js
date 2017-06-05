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
        collection.documentStructure = [document.toJSON()];
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

      async addDocument(document, parentDocumentId, index = -1) {
        if (!this.documentStructure) return;

        if (!parentDocumentId) {
          this.documentStructure.splice(index, 0, document.toJSON());
        } else {
          this.documentStructure = this.documentStructure.map(childDocument => {
            if (parentDocumentId === childDocument.id) {
              childDocument.children = childDocument.children.splice(
                index,
                0,
                document.toJSON()
              );
            }
            return childDocument;
          });
        }

        return this;
      },

      async updateDocument(document) {
        // if (!this.documentStructure) return;

        const updateChildren = (children, document) => {
          const id = document.id;
          console.log(id);
          if (_.find(children, { id })) {
            console.log(1);
            children = children.map(childDocument => {
              console.log(
                childDocument.id,
                childDocument.title,
                childDocument.id === id
              );
              if (childDocument.id === id) {
                childDocument = {
                  ...document.toJSON(),
                  children: childDocument.children,
                };
              }
              return childDocument;
            });
          } else {
            console.log(2);
            children = children.map(childDocument => {
              return updateChildren(childDocument.children, id);
            });
          }
          return children;
        };

        this.documentStructure = updateChildren(
          this.documentStructure,
          document
        );
        this.save();
        return this;
      },

      async deleteDocument(document) {
        if (!this.documentStructure) return;

        const deleteFromChildren = (children, id) => {
          if (_.find(children, { id })) {
            _.remove(children, { id });
          } else {
            children = children.map(childDocument => {
              return deleteFromChildren(childDocument.children, id);
            });
          }
          return children;
        };

        this.documentStructure = deleteFromChildren(
          this.documentStructure,
          document.id
        );
        return this;
      },
    },
  }
);

Collection.hasMany(Document, { as: 'documents', foreignKey: 'atlasId' });

export default Collection;
