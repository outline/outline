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
    // buildUrl() {
    //   const slugifiedTitle = slug(this.title);
    //   return `${slugifiedTitle}-${this.urlId}`;
    // }
  }
});

Atlas.hasMany(Document, { as: 'documents', foreignKey: 'atlasId' });
Atlas.hasOne(Document, { as: 'rootDocument', foreignKey: 'rootDocumentForId', constraints: false });

export default Atlas;
