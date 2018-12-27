// @flow
import { DataTypes, sequelize } from '../sequelize';

const CollectionUser = sequelize.define(
  'collection_user',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    permission: {
      type: DataTypes.STRING,
      validate: {
        isIn: [['read', 'read_write']],
      },
    },
  },
  {
    timestamps: true,
  }
);

CollectionUser.associate = models => {
  CollectionUser.belongsTo(models.Collection, {
    as: 'collection',
    foreignKey: 'collectionId',
  });
  CollectionUser.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'createdById',
  });
  CollectionUser.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
};

export default CollectionUser;
