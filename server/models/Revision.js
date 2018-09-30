// @flow
import { DataTypes, sequelize } from '../sequelize';

const Revision = sequelize.define('revision', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: DataTypes.STRING,
  text: DataTypes.TEXT,

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

Revision.associate = models => {
  Revision.belongsTo(models.Document, {
    as: 'document',
    foreignKey: 'documentId',
  });
  Revision.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
  Revision.addScope(
    'defaultScope',
    {
      include: [{ model: models.User, as: 'user', paranoid: false }],
    },
    { override: true }
  );
};

export default Revision;
