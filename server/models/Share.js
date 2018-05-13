// @flow
import { DataTypes, sequelize } from '../sequelize';

const Share = sequelize.define('share', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
});

Share.associate = models => {
  Share.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
  Share.belongsTo(models.Team, {
    as: 'team',
    foreignKey: 'teamId',
  });
  Share.belongsTo(models.Document, {
    as: 'document',
    foreignKey: 'documentId',
  });
};

export default Share;
