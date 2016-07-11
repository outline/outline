import {
  DataTypes,
  sequelize,
} from '../sequelize';
import _isEqual from 'lodash/isEqual';
import Document from './Document';

const allowedAtlasTypes = [['atlas', 'journal']];

const Atlas = sequelize.define('atlas', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  description: DataTypes.STRING,
  type: { type: DataTypes.STRING, validate: { isIn: allowedAtlasTypes }},

  /* type: atlas */
  navigationTree: DataTypes.JSONB,
}, {
  tableName: 'atlases',
  hooks: {
  //   beforeValidate: (doc) => {
  //     doc.urlId = randomstring.generate(15);
  //   },
  //   beforeCreate: (doc) => {
  //     doc.html = convertToMarkdown(doc.text);
  //     doc.preview = truncateMarkdown(doc.text, 160);
  //   },
  //   beforeUpdate: (doc) => {
  //     doc.html = convertToMarkdown(doc.text);
  //     doc.preview = truncateMarkdown(doc.text, 160);
  //   },
  },
  instanceMethods: {
    async getStructure() {
      if (this.navigationTree) {
        return this.navigationTree;
      }

      const getNodeForDocument = async (document) => {
        const children = await Document.findAll({ where: {
          parentDocumentId: document.id,
          atlasId: this.id,
        }});

        let childNodes = []
        await Promise.all(children.map(async (child) => {
          childNodes.push(await getNodeForDocument(child));
        }));

        return {
          title: document.title,
          id: document.id,
          url: document.getUrl(),
          children: childNodes,
        };
      }

      const rootDocument = await Document.findOne({
        where: {
          parentDocumentId: null,
          atlasId: this.id,
        }
      });

      if (rootDocument) {
        return await getNodeForDocument(rootDocument);
      } else {
        return; // TODO should create a root doc
      }
    },
    async updateNavigationTree(tree = this.navigationTree) {
      let nodeIds = [];
      nodeIds.push(tree.id);

      const rootDocument = await Document.findOne({
        where: {
          id: tree.id,
          atlasId: this.id,
        },
      });
      if (!rootDocument) throw new Error;

      let newTree = {
        id: tree.id,
        title: rootDocument.title,
        url: rootDocument.getUrl(),
        children: [],
      };

      const getIdsForChildren = async (children) => {
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
            })
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
        }
      });
      const documentIds = documents.map(doc => doc.id);

      if (!_isEqual(nodeIds.sort(), documentIds.sort())) {
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
      }

      const insertNode = (node) => {
        if (document.parentDocumentId === node.id) {
          node.children.push(newNode);
        } else {
          node.children = node.children.map(childNode => {
            return insertNode(childNode);
          })
        }

        return node;
      };

      this.navigationTree = insertNode(this.navigationTree);
    },
    async deleteDocument(document) {
      const deleteNodeAndDocument = async (node, documentId, shouldDelete = false) => {
        if (document.id === node.id) {
          shouldDelete = true;
        }
        const newChildren = [];
        node.children.map(async childNode => {
          const child = await deleteNodeAndDocument(childNode, documentId, shouldDelete);
          if (child) {
            newChildren.push(child);
          }
        });
        node.children = newChildren;

        if (shouldDelete) {
          const document = await Document.findById(node.id);
          await document.destroy();
        }

        return shouldDelete ? null : node;
      };

      this.navigationTree = await deleteNodeAndDocument(this.navigationTree, document.id);
    }
  }
});

Atlas.hasMany(Document, { as: 'documents', foreignKey: 'atlasId' });

export default Atlas;
