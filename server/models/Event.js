// @flow
import { DataTypes, sequelize } from '../sequelize';

const Event = sequelize.define('event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: DataTypes.STRING,
  data: DataTypes.JSONB,

  userId: {
    type: 'UUID',
    allowNull: true,
    references: {
      model: 'users',
    },
  },

  collectionId: {
    type: 'UUID',
    allowNull: true,
    references: {
      model: 'collections',
    },
  },

  teamId: {
    type: 'UUID',
    allowNull: true,
    references: {
      model: 'teams',
    },
  },
});

Event.associate = models => {
  Event.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
  Event.belongsTo(models.Collection, {
    as: 'collection',
    foreignKey: 'collectionId',
  });
  Event.belongsTo(models.Team, {
    as: 'team',
    foreignKey: 'teamId',
  });
};

export default Event;
