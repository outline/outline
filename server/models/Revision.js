// @flow
import { DataTypes, sequelize } from '../sequelize';

const Revision = sequelize.define('revision', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  editorVersion: DataTypes.STRING,
  title: DataTypes.STRING,
  text: DataTypes.TEXT,
});

Revision.associate = models => {
  Revision.belongsTo(models.Document, {
    as: 'document',
    foreignKey: 'documentId',
    onDelete: 'cascade',
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
