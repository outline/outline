// @flow
import { DataTypes, sequelize } from '../sequelize';

const Revision = sequelize.define('revision', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  version: DataTypes.SMALLINT,
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

Revision.prototype.migrateVersion = function() {
  // migrate from revision version 0 -> 1 means removing the title from the
  // revision text attribute.
  if (!this.version) {
    this.text = this.text.replace(/^#\s(.*)\n/, '');
    this.version = 1;
    return this.save({ silent: true, hooks: false });
  }
};

export default Revision;
