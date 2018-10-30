// @flow
import { DataTypes, sequelize } from '../sequelize';

const DocumentTag = sequelize.define('document_tag', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  tagId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tags',
    },
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'documents',
    },
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'teams',
    },
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

DocumentTag.associate = models => {
  DocumentTag.belongsTo(models.Document);
  DocumentTag.belongsTo(models.Tag);
};

export default DocumentTag;
