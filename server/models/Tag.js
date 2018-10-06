// @flow
import { DataTypes, sequelize } from '../sequelize';

const Tag = sequelize.define('tag', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
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

Tag.associate = models => {
  Tag.belongsToMany(models.Document, {
    through: 'document_tags',
    foreignKey: 'tagId',
  });
};

export default Tag;
