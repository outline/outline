// @flow
import events from "../events";
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
  events.add(event, { removeOnComplete: true });
});

// add can be used to send events into the event system without recording them
// in the database / audit trail
Event.add = (event) => {
  events.add(Event.build(event), { removeOnComplete: true });
};

Event.ACTIVITY_EVENTS = [
  "collections.create",
  "collections.delete",
  "documents.publish",
  "documents.archive",
  "documents.unarchive",
  "documents.pin",
  "documents.unpin",
  "documents.delete",
  "documents.restore",
  "users.create",
];

Event.AUDIT_EVENTS = [
  "api_keys.create",
  "api_keys.delete",
  "collections.create",
  "collections.update",
  "collections.add_user",
  "collections.remove_user",
  "collections.add_group",
  "collections.remove_group",
  "collections.delete",
  "documents.create",
  "documents.publish",
  "documents.update",
  "documents.archive",
  "documents.unarchive",
  "documents.pin",
  "documents.unpin",
  "documents.move",
  "documents.delete",
  "groups.create",
  "groups.update",
  "groups.delete",
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
