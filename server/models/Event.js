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
  events.add(event);
});

Event.ACTIVITY_EVENTS = [
  "users.create",
  "documents.publish",
  "documents.archive",
  "documents.unarchive",
  "documents.pin",
  "documents.unpin",
  "documents.delete",
  "documents.restore",
  "collections.create",
  "collections.delete",
];

Event.AUDIT_EVENTS = [
  "api_keys.create",
  "api_keys.delete",
  "users.create",
  "users.promote",
  "users.demote",
  "users.invite",
  "users.suspend",
  "users.activate",
  "users.delete",
  "documents.create",
  "documents.publish",
  "documents.update",
  "documents.archive",
  "documents.unarchive",
  "documents.pin",
  "documents.unpin",
  "documents.move",
  "documents.delete",
  "shares.create",
  "shares.update",
  "shares.revoke",
  "groups.create",
  "groups.update",
  "groups.delete",
  "collections.create",
  "collections.update",
  "collections.add_user",
  "collections.remove_user",
  "collections.add_group",
  "collections.remove_group",
  "collections.delete",
];

export default Event;
