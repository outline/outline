import {
  DataTypes,
  sequelize,
} from '../sequelize';
import Document from './Document';

const allowedAtlasTypes = [['atlas', 'journal']];

const Atlas = sequelize.define('atlas', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  description: DataTypes.STRING,
  type: { type: DataTypes.STRING, validate: { isIn: allowedAtlasTypes }},

  /* type: atlas */
  atlasStructure: DataTypes.JSONB,
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
    async buildStructure() {
      const getNodeForDocument = async (document) => {
        const children = await Document.findAll({ where: {
          parentDocumentId: document.id,
          atlasId: this.id,
        }});

        let childNodes = []
        await Promise.all(children.map(async (child) => {
          console.log(child.id)
          childNodes.push(await getNodeForDocument(child));
        }));

        return {
          name: document.title,
          id: document.id,
          url: document.getUrl(),
          children: childNodes,
        };
      }

      const rootDocument = await Document.findOne({ where: {
        parentDocumentId: null,
        atlasId: this.id,
      }});

      return await getNodeForDocument(rootDocument);
    }
  }
});

Atlas.hasMany(Document, { as: 'documents', foreignKey: 'atlasId' });

export default Atlas;
