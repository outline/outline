// @flow
import { globalEventQueue } from "../queues";
import { DataTypes, sequelize } from "../sequelize";

const Event = sequelize.define("event", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  modelId: DataTypes.UUID,
  name: DataTypes.STRING,
  ip: DataTypes.STRING,
  data: DataTypes.JSONB,
});

Event.associate = (models) => {
  Event.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  Event.belongsTo(models.User, {
    as: "actor",
    foreignKey: "actorId",
  });
  Event.belongsTo(models.Collection, {
    as: "collection",
    foreignKey: "collectionId",
  });
  Event.belongsTo(models.Collection, {
    as: "document",
    foreignKey: "documentId",
  });
  Event.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
};

Event.beforeCreate((event) => {
  if (event.ip) {
    // cleanup IPV6 representations of IPV4 addresses
    event.ip = event.ip.replace(/^::ffff:/, "");
  }
});

Event.afterCreate((event) => {
  globalEventQueue.add(event);
});

// add can be used to send events into the event system without recording them
// in the database or audit trail
Event.add = (event) => {
  const now = new Date();

  globalEventQueue.add(
    Event.build({
      createdAt: now,
      updatedAt: now,
      ...event,
    })
  );
};

Event.ACTIVITY_EVENTS = [
  "collections.create",
  "collections.delete",
  "collections.move",
  "collections.permission_changed",
  "documents.publish",
  "documents.archive",
  "documents.unarchive",
  "documents.pin",
  "documents.unpin",
  "documents.move",
  "documents.delete",
  "documents.permanent_delete",
  "documents.restore",
  "revisions.create",
  "users.create",
];

Event.AUDIT_EVENTS = [
  "api_keys.create",
  "api_keys.delete",
  "authenticationProviders.update",
  "collections.create",
  "collections.update",
  "collections.permission_changed",
  "collections.move",
  "collections.add_user",
  "collections.remove_user",
  "collections.add_group",
  "collections.remove_group",
  "collections.delete",
  "collections.export_all",
  "documents.create",
  "documents.publish",
  "documents.update",
  "documents.archive",
  "documents.unarchive",
  "documents.pin",
  "documents.unpin",
  "documents.move",
  "documents.delete",
  "documents.permanent_delete",
  "documents.restore",
  "groups.create",
  "groups.update",
  "groups.delete",
  "revisions.create",
  "shares.create",
  "shares.update",
  "shares.revoke",
  "teams.update",
  "users.create",
  "users.update",
  "users.signin",
  "users.promote",
  "users.demote",
  "users.invite",
  "users.suspend",
  "users.activate",
  "users.delete",
];

export default Event;
