import slug from 'slug';
import randomstring from 'randomstring';
import { DataTypes, sequelize } from '../sequelize';
import _ from 'lodash';
import Document from './Document';

slug.defaults.mode = 'rfc3986';

const allowedCollectionTypes = [['atlas', 'journal']];

const Collection = sequelize.define(
  'atlas',
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
    navigationTree: DataTypes.JSONB,
  },
  {
    tableName: 'atlases',
    paranoid: true,
    hooks: {
      beforeValidate: collection => {
        collection.urlId = collection.urlId || randomstring.generate(10);
      },
      afterCreate: async collection => {
        if (collection.type !== 'atlas') return;

        await Document.create({
          parentDocumentId: null,
          atlasId: collection.id,
          teamId: collection.teamId,
          userId: collection.creatorId,
          lastModifiedById: collection.creatorId,
          createdById: collection.creatorId,
          title: 'Introduction',
          text: '# Introduction\n\nLets get started...',
        });
        await collection.buildStructure();
        await collection.save();
      },
    },
    instanceMethods: {
      getUrl() {
        // const slugifiedName = slug(this.name);
        // return `/${slugifiedName}-c${this.urlId}`;
        return `/collections/${this.id}`;
      },
      async buildStructure() {
        if (this.navigationTree) return this.navigationTree;

        const getNodeForDocument = async document => {
          const children = await Document.findAll({
            where: {
              parentDocumentId: document.id,
              atlasId: this.id,
            },
          });

          const childNodes = [];
          await Promise.all(
            children.map(async child => {
              return childNodes.push(await getNodeForDocument(child));
            })
          );

          return {
            title: document.title,
            id: document.id,
            url: document.getUrl(),
            children: childNodes,
          };
        };

        const rootDocument = await Document.findOne({
          where: {
            parentDocumentId: null,
            atlasId: this.id,
          },
        });

        this.navigationTree = await getNodeForDocument(rootDocument);
        return this.navigationTree;
      },
      async updateNavigationTree(tree = this.navigationTree) {
        const nodeIds = [];
        nodeIds.push(tree.id);

        const rootDocument = await Document.findOne({
          where: {
            id: tree.id,
            atlasId: this.id,
          },
        });
        if (!rootDocument) throw new Error();

        const newTree = {
          id: tree.id,
          title: rootDocument.title,
          url: rootDocument.getUrl(),
          children: [],
        };

        const getIdsForChildren = async children => {
          const childNodes = [];
          for (const child of children) {
            const childDocument = await Document.findOne({
              where: {
                id: child.id,
                atlasId: this.id,
              },
            });
            if (childDocument) {
              childNodes.push({
                id: childDocument.id,
                title: childDocument.title,
                url: childDocument.getUrl(),
                children: await getIdsForChildren(child.children),
              });
              nodeIds.push(child.id);
            }
          }
          return childNodes;
        };
        newTree.children = await getIdsForChildren(tree.children);

        const documents = await Document.findAll({
          attributes: ['id'],
          where: {
            atlasId: this.id,
          },
        });
        const documentIds = documents.map(doc => doc.id);

        if (!_.isEqual(nodeIds.sort(), documentIds.sort())) {
          throw new Error('Invalid navigation tree');
        }

        this.navigationTree = newTree;
        await this.save();

        return newTree;
      },
      async addNodeToNavigationTree(document) {
        const newNode = {
          id: document.id,
          title: document.title,
          url: document.getUrl(),
          children: [],
        };

        const insertNode = node => {
          if (document.parentDocumentId === node.id) {
            node.children.push(newNode);
          } else {
            node.children = node.children.map(childNode => {
              return insertNode(childNode);
            });
          }

          return node;
        };

        this.navigationTree = insertNode(this.navigationTree);
        return this.navigationTree;
      },
      async deleteDocument(document) {
        const deleteNodeAndDocument = async (
          node,
          documentId,
          shouldDelete = false
        ) => {
          // Delete node if id matches
          if (document.id === node.id) shouldDelete = true;

          const newChildren = [];
          node.children.forEach(async childNode => {
            const child = await deleteNodeAndDocument(
              childNode,
              documentId,
              shouldDelete
            );
            if (child) newChildren.push(child);
          });
          node.children = newChildren;

          if (shouldDelete) {
            const doc = await Document.findById(node.id);
            await doc.destroy();
          }

          return shouldDelete ? null : node;
        };

        this.navigationTree = await deleteNodeAndDocument(
          this.navigationTree,
          document.id
        );
      },
    },
  }
);

Collection.hasMany(Document, { as: 'documents', foreignKey: 'atlasId' });

export default Collection;
