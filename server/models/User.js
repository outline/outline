// @flow
import crypto from "crypto";
import addMinutes from "date-fns/add_minutes";
import subMinutes from "date-fns/sub_minutes";
import JWT from "jsonwebtoken";
import uuid from "uuid";
import { languages } from "../../shared/i18n";
import { ValidationError } from "../errors";
import { sendEmail } from "../mailer";
import { DataTypes, sequelize, encryptedFields } from "../sequelize";
import { publicS3Endpoint, uploadToS3FromUrl } from "../utils/s3";
import { Star, Team, Collection, NotificationSetting, ApiKey } from ".";

const DEFAULT_AVATAR_HOST = "https://tiley.herokuapp.com";

const User = sequelize.define(
  "user",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING },
    username: { type: DataTypes.STRING },
    name: DataTypes.STRING,
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
    isAdmin: DataTypes.BOOLEAN,
    service: { type: DataTypes.STRING, allowNull: true },
    serviceId: { type: DataTypes.STRING, allowNull: true, unique: true },
    slackData: DataTypes.JSONB,
    jwtSecret: encryptedFields().vault("jwtSecret"),
    lastActiveAt: DataTypes.DATE,
    lastActiveIp: { type: DataTypes.STRING, allowNull: true },
    lastSignedInAt: DataTypes.DATE,
    lastSignedInIp: { type: DataTypes.STRING, allowNull: true },
    lastSigninEmailSentAt: DataTypes.DATE,
    suspendedAt: DataTypes.DATE,
    suspendedById: DataTypes.UUID,
    language: {
      type: DataTypes.STRING,
      defaultValue: process.env.DEFAULT_LANGUAGE,
      validate: {
        isIn: [languages],
      },
    },
  },
  {
    paranoid: true,
    getterMethods: {
      isSuspended() {
        return !!this.suspendedAt;
      },
      avatarUrl() {
        const original = this.getDataValue("avatarUrl");
        if (original) {
          return original;
        }

        const hash = crypto
          .createHash("md5")
          .update(this.email || "")
          .digest("hex");
        return `${DEFAULT_AVATAR_HOST}/avatar/${hash}/${this.name[0]}.png`;
      },
    },
  }
);

// Class methods
User.associate = (models) => {
  User.hasMany(models.ApiKey, { as: "apiKeys", onDelete: "cascade" });
  User.hasMany(models.NotificationSetting, {
    as: "notificationSettings",
    onDelete: "cascade",
  });
  User.hasMany(models.Document, { as: "documents" });
  User.hasMany(models.View, { as: "views" });
  User.belongsTo(models.Team);
};

// Instance methods
User.prototype.collectionIds = async function (options = {}) {
  const collectionStubs = await Collection.scope({
    method: ["withMembership", this.id],
  }).findAll({
    attributes: ["id", "private"],
    where: { teamId: this.teamId },
    paranoid: true,
    ...options,
  });

  return collectionStubs
    .filter(
      (c) =>
        !c.private ||
        c.memberships.length > 0 ||
        c.collectionGroupMemberships.length > 0
    )
    .map((c) => c.id);
};

User.prototype.updateActiveAt = function (ip, force = false) {
  const fiveMinutesAgo = subMinutes(new Date(), 5);

  // ensure this is updated only every few minutes otherwise
  // we'll be constantly writing to the DB as API requests happen
  if (this.lastActiveAt < fiveMinutesAgo || force) {
    this.lastActiveAt = new Date();
    this.lastActiveIp = ip;
    return this.save({ hooks: false });
  }
};

User.prototype.updateSignedIn = function (ip) {
  this.lastSignedInAt = new Date();
  this.lastSignedInIp = ip;
  return this.save({ hooks: false });
};

// Returns a session token that is used to make API requests and is stored
// in the client browser cookies to remain logged in.
User.prototype.getJwtToken = function (expiresAt?: Date) {
  return JWT.sign(
    {
      id: this.id,
      expiresAt: expiresAt ? expiresAt.toISOString() : undefined,
      type: "session",
    },
    this.jwtSecret
  );
};

// Returns a temporary token that is only used for transferring a session
// between subdomains or domains. It has a short expiry and can only be used once
User.prototype.getTransferToken = function () {
  return JWT.sign(
    {
      id: this.id,
      createdAt: new Date().toISOString(),
      expiresAt: addMinutes(new Date(), 1).toISOString(),
      type: "transfer",
    },
    this.jwtSecret
  );
};

// Returns a temporary token that is only used for logging in from an email
// It can only be used to sign in once and has a medium length expiry
User.prototype.getEmailSigninToken = function () {
  if (this.service && this.service !== "email") {
    throw new Error("Cannot generate email signin token for OAuth user");
  }

  return JWT.sign(
    { id: this.id, createdAt: new Date().toISOString(), type: "email-signin" },
    this.jwtSecret
  );
};

const uploadAvatar = async (model) => {
  const endpoint = publicS3Endpoint();
  const { avatarUrl } = model;

  if (
    avatarUrl &&
    !avatarUrl.startsWith("/api") &&
    !avatarUrl.startsWith(endpoint) &&
    !avatarUrl.startsWith(DEFAULT_AVATAR_HOST)
  ) {
    try {
      const newUrl = await uploadToS3FromUrl(
        avatarUrl,
        `avatars/${model.id}/${uuid.v4()}`,
        "public-read"
      );
      if (newUrl) model.avatarUrl = newUrl;
    } catch (err) {
      // we can try again next time
      console.error(err);
    }
  }
};

const setRandomJwtSecret = (model) => {
  model.jwtSecret = crypto.randomBytes(64).toString("hex");
};

const removeIdentifyingInfo = async (model, options) => {
  await NotificationSetting.destroy({
    where: { userId: model.id },
    transaction: options.transaction,
  });
  await ApiKey.destroy({
    where: { userId: model.id },
    transaction: options.transaction,
  });
  await Star.destroy({
    where: { userId: model.id },
    transaction: options.transaction,
  });

  model.email = null;
  model.name = "Unknown";
  model.avatarUrl = "";
  model.serviceId = null;
  model.username = null;
  model.slackData = null;
  model.lastActiveIp = null;
  model.lastSignedInIp = null;

  // this shouldn't be needed once this issue is resolved:
  // https://github.com/sequelize/sequelize/issues/9318
  await model.save({ hooks: false, transaction: options.transaction });
};

const checkLastAdmin = async (model) => {
  const teamId = model.teamId;

  if (model.isAdmin) {
    const userCount = await User.count({ where: { teamId } });
    const adminCount = await User.count({ where: { isAdmin: true, teamId } });

    if (userCount > 1 && adminCount <= 1) {
      throw new ValidationError(
        "Cannot delete account as only admin. Please transfer admin permissions to another user and try again."
      );
    }
  }
};

User.beforeDestroy(checkLastAdmin);
User.beforeDestroy(removeIdentifyingInfo);
User.beforeSave(uploadAvatar);
User.beforeCreate(setRandomJwtSecret);
User.afterCreate(async (user) => {
  const team = await Team.findByPk(user.teamId);

  // From Slack support:
  // If you wish to contact users at an email address obtained through Slack,
  // you need them to opt-in through a clear and separate process.
  if (user.service && user.service !== "slack") {
    sendEmail("welcome", user.email, { teamUrl: team.url });
  }
});

// By default when a user signs up we subscribe them to email notifications
// when documents they created are edited by other team members and onboarding
User.afterCreate(async (user, options) => {
  await Promise.all([
    NotificationSetting.findOrCreate({
      where: {
        userId: user.id,
        teamId: user.teamId,
        event: "documents.update",
      },
      transaction: options.transaction,
    }),
    NotificationSetting.findOrCreate({
      where: {
        userId: user.id,
        teamId: user.teamId,
        event: "emails.onboarding",
      },
      transaction: options.transaction,
    }),
  ]);
});

export default User;
