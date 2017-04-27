import { DataTypes, sequelize } from '../sequelize';

const Revision = sequelize.define('revision', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: DataTypes.STRING,
  text: DataTypes.TEXT,
  html: DataTypes.TEXT,
  preview: DataTypes.TEXT,

  userId: {
    type: 'UUID',
    allowNull: false,
    references: {
      model: 'users',
    },
  },

  documentId: {
    type: 'UUID',
    allowNull: false,
    references: {
      model: 'documents',
      onDelete: 'CASCADE',
    },
  },
});

export default Revision;
