import crypto from "crypto";
import { addMinutes, subMinutes } from "date-fns";
import JWT from "jsonwebtoken";
import { Transaction, QueryTypes, FindOptions } from "sequelize";
import {
  Table,
  Column,
  IsIP,
  IsEmail,
  HasOne,
  Default,
  IsIn,
  BeforeDestroy,
  BeforeSave,
  BeforeCreate,
  AfterCreate,
  BelongsTo,
  ForeignKey,
  DataType,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import { languages } from "@shared/i18n";
import Logger from "@server/logging/logger";
import { DEFAULT_AVATAR_HOST } from "@server/utils/avatars";
import { palette } from "@server/utils/color";
import { publicS3Endpoint, uploadToS3FromUrl } from "@server/utils/s3";
import { ValidationError } from "../errors";
import { sequelize, encryptedFields, Op } from "../sequelize";
import Team from "./Team";
import ParanoidModel from "./base/ParanoidModel";
import {
  UserAuthentication,
  Star,
  Collection,
  NotificationSetting,
  ApiKey,
} from ".";

@Table({ tableName: "users", modelName: "user" })
class User extends ParanoidModel {
  @Column
  @IsEmail
  email: string | null;

  @Column
  username: string | null;

  @Column
  name: string;

  @Column
  @Default(false)
  isAdmin: boolean;

  @Column
  @Default(false)
  isViewer: boolean;

  @Column(encryptedFields().vault("jwtSecret"))
  jwtSecret: string;

  @Column
  lastActiveAt: Date | null;

  @Column
  @IsIP
  lastActiveIp: string | null;

  @Column
  lastSignedInAt: Date | null;

  @Column
  @IsIP
  lastSignedInIp: string | null;

  @Column
  lastSigninEmailSentAt: Date | null;

  @Column
  suspendedAt: Date | null;

  @HasOne(() => User, "suspendedById")
  suspendedBy: User;

  @Column
  @Default(process.env.DEFAULT_LANGUAGE)
  @IsIn([languages])
  language: string;

  @Column(DataType.STRING)
  get avatarUrl() {
    const original = this.getDataValue("avatarUrl");

    if (original) {
      return original;
    }

    const color = this.color.replace(/^#/, "");
    const initial = this.name ? this.name[0] : "?";
    const hash = crypto
      .createHash("md5")
      .update(this.email || "")
      .digest("hex");
    return `${DEFAULT_AVATAR_HOST}/avatar/${hash}/${initial}.png?c=${color}`;
  }

  set avatarUrl(value: string | null) {
    this.setDataValue("avatarUrl", value);
  }

  // associations

  @BelongsTo(() => Team)
  team: Team;

  @ForeignKey(() => User)
  @Column
  teamId: string;

  // getters

  get isSuspended(): boolean {
    return !!this.suspendedAt;
  }

  get isInvited() {
    return !this.lastActiveAt;
  }

  get color() {
    const idAsHex = crypto.createHash("md5").update(this.id).digest("hex");
    const idAsNumber = parseInt(idAsHex, 16);
    return palette[idAsNumber % palette.length];
  }

  collectionIds = async function (options = {}) {
    const collectionStubs = await Collection.scope({
      method: ["withMembership", this.id],
    }).findAll({
      attributes: ["id", "permission"],
      where: {
        teamId: this.teamId,
      },
      paranoid: true,
      ...options,
    });

    return collectionStubs
      .filter(
        (c) =>
          c.permission === "read" ||
          c.permission === "read_write" ||
          c.memberships.length > 0 ||
          c.collectionGroupMemberships.length > 0
      )
      .map((c) => c.id);
  };

  updateActiveAt = function (ip: string, force = false) {
    const fiveMinutesAgo = subMinutes(new Date(), 5);

    // ensure this is updated only every few minutes otherwise
    // we'll be constantly writing to the DB as API requests happen
    if (this.lastActiveAt < fiveMinutesAgo || force) {
      this.lastActiveAt = new Date();
      this.lastActiveIp = ip;
      return this.save({
        hooks: false,
      });
    }
  };

  updateSignedIn = function (ip: string) {
    this.lastSignedInAt = new Date();
    this.lastSignedInIp = ip;
    return this.save({
      hooks: false,
    });
  };

  // Returns a session token that is used to make API requests and is stored
  // in the client browser cookies to remain logged in.
  getJwtToken = function (expiresAt?: Date) {
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
  getTransferToken = function () {
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
  getEmailSigninToken = function () {
    return JWT.sign(
      {
        id: this.id,
        createdAt: new Date().toISOString(),
        type: "email-signin",
      },
      this.jwtSecret
    );
  };

  demote = async function (teamId: string, to: "member" | "viewer") {
    const res = await User.findAndCountAll({
      where: {
        teamId,
        isAdmin: true,
        id: {
          [Op.ne]: this.id,
        },
      },
      limit: 1,
    });

    if (res.count >= 1) {
      if (to === "member") {
        return this.update({
          isAdmin: false,
          isViewer: false,
        });
      } else if (to === "viewer") {
        return this.update({
          isAdmin: false,
          isViewer: true,
        });
      }
    } else {
      throw ValidationError("At least one admin is required");
    }
  };

  promote = async function () {
    return this.update({
      isAdmin: true,
      isViewer: false,
    });
  };

  activate = async function () {
    return this.update({
      suspendedById: null,
      suspendedAt: null,
    });
  };

  // hooks

  @BeforeDestroy
  static removeIdentifyingInfo = async (
    model: User,
    options: { transaction: Transaction }
  ) => {
    await NotificationSetting.destroy({
      where: {
        userId: model.id,
      },
      transaction: options.transaction,
    });
    await ApiKey.destroy({
      where: {
        userId: model.id,
      },
      transaction: options.transaction,
    });
    await Star.destroy({
      where: {
        userId: model.id,
      },
      transaction: options.transaction,
    });
    await UserAuthentication.destroy({
      where: {
        userId: model.id,
      },
      transaction: options.transaction,
    });
    model.email = null;
    model.name = "Unknown";
    model.avatarUrl = null;
    model.username = null;
    model.lastActiveIp = null;
    model.lastSignedInIp = null;

    // this shouldn't be needed once this issue is resolved:
    // https://github.com/sequelize/sequelize/issues/9318
    await model.save({
      hooks: false,
      transaction: options.transaction,
    });
  };

  @BeforeSave
  static uploadAvatar = async (model: User) => {
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
          `avatars/${model.id}/${uuidv4()}`,
          "public-read"
        );
        if (newUrl) model.avatarUrl = newUrl;
      } catch (err) {
        Logger.error("Couldn't upload user avatar image to S3", err, {
          url: avatarUrl,
        });
      }
    }
  };

  @BeforeCreate
  static setRandomJwtSecret = (model: User) => {
    model.jwtSecret = crypto.randomBytes(64).toString("hex");
  };

  // By default when a user signs up we subscribe them to email notifications
  // when documents they created are edited by other team members and onboarding
  @AfterCreate
  static subscribeToNotifications = async (
    model: User,
    options: { transaction: Transaction }
  ) => {
    await Promise.all([
      NotificationSetting.findOrCreate({
        where: {
          userId: model.id,
          teamId: model.teamId,
          event: "documents.update",
        },
        transaction: options.transaction,
      }),
      NotificationSetting.findOrCreate({
        where: {
          userId: model.id,
          teamId: model.teamId,
          event: "emails.onboarding",
        },
        transaction: options.transaction,
      }),
      NotificationSetting.findOrCreate({
        where: {
          userId: model.id,
          teamId: model.teamId,
          event: "emails.features",
        },
        transaction: options.transaction,
      }),
    ]);
  };

  static getCounts = async function (teamId: string) {
    const countSql = `
      SELECT 
        COUNT(CASE WHEN "suspendedAt" IS NOT NULL THEN 1 END) as "suspendedCount",
        COUNT(CASE WHEN "isAdmin" = true THEN 1 END) as "adminCount",
        COUNT(CASE WHEN "isViewer" = true THEN 1 END) as "viewerCount",
        COUNT(CASE WHEN "lastActiveAt" IS NULL THEN 1 END) as "invitedCount",
        COUNT(CASE WHEN "suspendedAt" IS NULL AND "lastActiveAt" IS NOT NULL THEN 1 END) as "activeCount",
        COUNT(*) as count
      FROM users
      WHERE "deletedAt" IS NULL
      AND "teamId" = :teamId
    `;
    const results = await sequelize.query(countSql, {
      type: QueryTypes.SELECT,
      replacements: {
        teamId,
      },
    });

    const counts: {
      activeCount: string;
      adminCount: string;
      invitedCount: string;
      suspendedCount: string;
      viewerCount: string;
      count: string;
    } = results[0] as any;

    return {
      active: parseInt(counts.activeCount),
      admins: parseInt(counts.adminCount),
      viewers: parseInt(counts.viewerCount),
      all: parseInt(counts.count),
      invited: parseInt(counts.invitedCount),
      suspended: parseInt(counts.suspendedCount),
    };
  };

  static findAllInBatches = async (
    query: FindOptions<User>,
    callback: (users: Array<User>, query: FindOptions<User>) => Promise<void>
  ) => {
    if (!query.offset) query.offset = 0;
    if (!query.limit) query.limit = 10;
    let results;

    do {
      results = await User.findAll(query);
      await callback(results, query);
      query.offset += query.limit;
    } while (results.length >= query.limit);
  };
}

export default User;
