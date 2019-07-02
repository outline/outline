// @flow
import { DataTypes, sequelize } from '../sequelize';
import events from '../events';

const Event = sequelize.define('event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: DataTypes.STRING,
  data: DataTypes.JSONB,
});

Event.associate = models => {
  Event.belongsTo(models.User, {
    as: 'user',
    foreignKey: 'userId',
  });
  Event.belongsTo(models.User, {
    as: 'actor',
    foreignKey: 'actorId',
  });
  Event.belongsTo(models.Collection, {
    as: 'collection',
    foreignKey: 'collectionId',
  });
  Event.belongsTo(models.Collection, {
    as: 'document',
    foreignKey: 'documentId',
  });
  Event.belongsTo(models.Team, {
    as: 'team',
    foreignKey: 'teamId',
  });
};

Event.afterCreate(event => {
  events.add(event);
});

Event.ACTIVITY_EVENTS = [
  'users.create',
  'documents.publish',
  'documents.delete',
  'documents.archive',
  'documents.unarchive',
  'documents.pin',
  'documents.unpin',
  'collections.create',
  'collections.delete',
];

export default Event;
