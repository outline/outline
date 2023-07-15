import crypto from "crypto";
import { addHours, addMinutes, subMinutes } from "date-fns";
import JWT from "jsonwebtoken";
import { Context } from "koa";
import { Transaction, QueryTypes, SaveOptions, Op } from "sequelize";
import {
  Table,
  Column,
  IsIP,
  IsEmail,
  Default,
  IsIn,
  BeforeDestroy,
  BeforeCreate,
  BelongsTo,
  ForeignKey,
  DataType,
  HasMany,
  Scopes,
  IsDate,
  IsUrl,
  AllowNull,
  AfterUpdate,
} from "sequelize-typescript";
import { UserPreferenceDefaults } from "@shared/constants";
import { languages } from "@shared/i18n";
import type { NotificationSettings } from "@shared/types";
import {
  CollectionPermission,
  UserPreference,
  UserPreferences,
  NotificationEventType,
  NotificationEventDefaults,
} from "@shared/types";
import { stringToColor } from "@shared/utils/color";
import env from "@server/env";
import DeleteAttachmentTask from "@server/queues/tasks/DeleteAttachmentTask";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import { ValidationError } from "../errors";
import ApiKey from "./ApiKey";
import Attachment from "./Attachment";
import AuthenticationProvider from "./AuthenticationProvider";
import Collection from "./Collection";
import CollectionUser from "./CollectionUser";
import Star from "./Star";
import Team from "./Team";
import UserAuthentication from "./UserAuthentication";
import ParanoidModel from "./base/ParanoidModel";
import Encrypted, {
  setEncryptedColumn,
  getEncryptedColumn,
} from "./decorators/Encrypted";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

/**
 * Flags that are available for setting on the user.
 */
export enum UserFlag {
  InviteSent = "inviteSent",
  InviteReminderSent = "inviteReminderSent",
  Desktop = "desktop",
  DesktopWeb = "desktopWeb",
  MobileWeb = "mobileWeb",
}

export enum UserRole {
  Member = "member",
  Viewer = "viewer",
}

@Scopes(() => ({
  withAuthentications: {
    include: [
      {
        separate: true,
        model: UserAuthentication,
        as: "authentications",
        include: [
          {
            model: AuthenticationProvider,
            as: "authenticationProvider",
            where: {
              enabled: true,
            },
          },
        ],
      },
    ],
  },
  withTeam: {
    include: [
      {
        model: Team,
        as: "team",
        required: true,
      },
    ],
  },
  withInvitedBy: {
    include: [
      {
        model: User,
        as: "invitedBy",
        required: true,
      },
    ],
  },
  invited: {
    where: {
      lastActiveAt: {
        [Op.is]: null,
      },
    },
  },
}))
@Table({ tableName: "users", modelName: "user" })
@Fix
class User extends ParanoidModel {
  @IsEmail
  @Length({ max: 255, msg: "User email must be 255 characters or less" })
  @Column
  email: string | null;

  @NotContainsUrl
  @Length({ max: 255, msg: "User name must be 255 characters or less" })
  @Column
  name: string;

  @Default(false)
  @Column
  isAdmin: boolean;

  @Default(false)
  @Column
  isViewer: boolean;

  @Column(DataType.BLOB)
  @Encrypted
  get jwtSecret() {
    return getEncryptedColumn(this, "jwtSecret");
  }

  set jwtSecret(value: string) {
    setEncryptedColumn(this, "jwtSecret", value);
  }

  @IsDate
  @Column
  lastActiveAt: Date | null;

  @IsIP
  @Column
  lastActiveIp: string | null;

  @IsDate
  @Column
  lastSignedInAt: Date | null;

  @IsIP
  @Column
  lastSignedInIp: string | null;

  @IsDate
  @Column
  lastSigninEmailSentAt: Date | null;

  @IsDate
  @Column
  suspendedAt: Date | null;

  @Column(DataType.JSONB)
  flags: { [key in UserFlag]?: number } | null;

  @AllowNull
  @Column(DataType.JSONB)
  preferences: UserPreferences | null;

  @Column(DataType.JSONB)
  notificationSettings: NotificationSettings;

  @Default(env.DEFAULT_LANGUAGE)
  @IsIn([languages])
  @Column
  language: string;

  @AllowNull
  @IsUrl
  @Length({ max: 4096, msg: "avatarUrl must be less than 4096 characters" })
  @Column(DataType.STRING)
  get avatarUrl() {
    const original = this.getDataValue("avatarUrl");

    if (original && !original.startsWith("https://tiley.herokuapp.com")) {
      return original;
    }

    return null;
  }

  set avatarUrl(value: string | null) {
    this.setDataValue("avatarUrl", value);
  }

  // associations
  @BelongsTo(() => User, "suspendedById")
  suspendedBy: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  suspendedById: string | null;

  @BelongsTo(() => User, "invitedById")
  invitedBy: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  invitedById: string | null;

  @BelongsTo(() => Team)
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @HasMany(() => UserAuthentication)
  authentications: UserAuthentication[];

  // getters

  get isSuspended(): boolean {
    return !!this.suspendedAt;
  }

  get isInvited() {
    return !this.lastActiveAt;
  }

  get color() {
    return stringToColor(this.id);
  }

  get defaultCollectionPermission(): CollectionPermission {
    return this.isViewer
      ? CollectionPermission.Read
      : CollectionPermission.ReadWrite;
  }

  /**
   * Returns a code that can be used to delete this user account. The code will
   * be rotated when the user signs out.
   *
   * @returns The deletion code.
   */
  get deleteConfirmationCode() {
    return crypto
      .createHash("md5")
      .update(this.jwtSecret)
      .digest("hex")
      .replace(/[l1IoO0]/gi, "")
      .slice(0, 8)
      .toUpperCase();
  }

  // instance methods

  /**
   * Sets a preference for the users notification settings.
   *
   * @param type The type of notification event
   * @param value Set the preference to true/false
   */
  public setNotificationEventType = (
    type: NotificationEventType,
    value = true
  ) => {
    this.notificationSettings[type] = value;
    this.changed("notificationSettings", true);
  };

  /**
   * Returns the current preference for the given notification event type taking
   * into account the default system value.
   *
   * @param type The type of notification event
   * @returns The current preference
   */
  public subscribedToEventType = (type: NotificationEventType) =>
    this.notificationSettings[type] ?? NotificationEventDefaults[type] ?? false;

  /**
   * User flags are for storing information on a user record that is not visible
   * to the user itself.
   *
   * @param flag The flag to set
   * @param value Set the flag to true/false
   * @returns The current user flags
   */
  public setFlag = (flag: UserFlag, value = true) => {
    if (!this.flags) {
      this.flags = {};
    }
    const binary = value ? 1 : 0;
    if (this.flags[flag] !== binary) {
      this.flags[flag] = binary;
      this.changed("flags", true);
    }

    return this.flags;
  };

  /**
   * Returns the content of the given user flag.
   *
   * @param flag The flag to retrieve
   * @returns The flag value
   */
  public getFlag = (flag: UserFlag) => this.flags?.[flag] ?? 0;

  /**
   * User flags are for storing information on a user record that is not visible
   * to the user itself.
   *
   * @param flag The flag to set
   * @param value The amount to increment by, defaults to 1
   * @returns The current user flags
   */
  public incrementFlag = (flag: UserFlag, value = 1) => {
    if (!this.flags) {
      this.flags = {};
    }
    this.flags[flag] = (this.flags[flag] ?? 0) + value;
    this.changed("flags", true);

    return this.flags;
  };

  /**
   * Preferences set by the user that decide application behavior and ui.
   *
   * @param preference The user preference to set
   * @param value Sets the preference value
   * @returns The current user preferences
   */
  public setPreference = (preference: UserPreference, value: boolean) => {
    if (!this.preferences) {
      this.preferences = {};
    }
    this.preferences[preference] = value;
    this.changed("preferences", true);

    return this.preferences;
  };

  /**
   * Returns the value of the givem preference
   *
   * @param preference The user preference to retrieve
   * @returns The preference value if set, else the default value.
   */
  public getPreference = (preference: UserPreference) =>
    this.preferences?.[preference] ??
    UserPreferenceDefaults[preference] ??
    false;

  collectionIds = async (options = {}) => {
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
          Object.values(CollectionPermission).includes(
            c.permission as CollectionPermission
          ) ||
          c.memberships.length > 0 ||
          c.collectionGroupMemberships.length > 0
      )
      .map((c) => c.id);
  };

  updateActiveAt = async (ctx: Context, force = false) => {
    const { ip } = ctx.request;
    const fiveMinutesAgo = subMinutes(new Date(), 5);

    // ensure this is updated only every few minutes otherwise
    // we'll be constantly writing to the DB as API requests happen
    if (!this.lastActiveAt || this.lastActiveAt < fiveMinutesAgo || force) {
      this.lastActiveAt = new Date();
      this.lastActiveIp = ip;
    }

    // Track the clients each user is using
    if (ctx.userAgent?.source.includes("Outline/")) {
      this.setFlag(UserFlag.Desktop);
    } else if (ctx.userAgent?.isDesktop) {
      this.setFlag(UserFlag.DesktopWeb);
    } else if (ctx.userAgent?.isMobile) {
      this.setFlag(UserFlag.MobileWeb);
    }

    // Save only writes to the database if there are changes
    return this.save({
      hooks: false,
    });
  };

  updateSignedIn = (ip: string) => {
    const now = new Date();
    this.lastActiveAt = now;
    this.lastActiveIp = ip;
    this.lastSignedInAt = now;
    this.lastSignedInIp = ip;
    return this.save({ hooks: false });
  };

  /**
   * Rotate's the users JWT secret. This has the effect of invalidating ALL
   * previously issued tokens.
   *
   * @param options Save options
   * @returns Promise that resolves when database persisted
   */
  rotateJwtSecret = (options: SaveOptions) => {
    User.setRandomJwtSecret(this);
    return this.save(options);
  };

  /**
   * Returns a session token that is used to make API requests and is stored
   * in the client browser cookies to remain logged in.
   *
   * @param expiresAt The time the token will expire at
   * @returns The session token
   */
  getJwtToken = (expiresAt?: Date) =>
    JWT.sign(
      {
        id: this.id,
        expiresAt: expiresAt ? expiresAt.toISOString() : undefined,
        type: "session",
      },
      this.jwtSecret
    );

  /**
   * Returns a session token that is used to make collaboration requests and is
   * stored in the client memory.
   *
   * @returns The session token
   */
  getCollaborationToken = () =>
    JWT.sign(
      {
        id: this.id,
        expiresAt: addHours(new Date(), 24).toISOString(),
        type: "collaboration",
      },
      this.jwtSecret
    );

  /**
   * Returns a temporary token that is only used for transferring a session
   * between subdomains or domains. It has a short expiry and can only be used
   * once.
   *
   * @returns The transfer token
   */
  getTransferToken = () =>
    JWT.sign(
      {
        id: this.id,
        createdAt: new Date().toISOString(),
        expiresAt: addMinutes(new Date(), 1).toISOString(),
        type: "transfer",
      },
      this.jwtSecret
    );

  /**
   * Returns a temporary token that is only used for logging in from an email
   * It can only be used to sign in once and has a medium length expiry
   *
   * @returns The email signin token
   */
  getEmailSigninToken = () =>
    JWT.sign(
      {
        id: this.id,
        createdAt: new Date().toISOString(),
        type: "email-signin",
      },
      this.jwtSecret
    );

  /**
   * Returns a list of teams that have a user matching this user's email.
   *
   * @returns A promise resolving to a list of teams
   */
  availableTeams = async () =>
    Team.findAll({
      include: [
        {
          model: this.constructor as typeof User,
          required: true,
          where: { email: this.email },
        },
      ],
    });

  demote = async (to: UserRole, options?: SaveOptions<User>) => {
    const res = await (this.constructor as typeof User).findAndCountAll({
      where: {
        teamId: this.teamId,
        isAdmin: true,
        id: {
          [Op.ne]: this.id,
        },
      },
      limit: 1,
    });

    if (res.count >= 1) {
      if (to === "member") {
        await this.update(
          {
            isAdmin: false,
            isViewer: false,
          },
          options
        );
      } else if (to === "viewer") {
        await this.update(
          {
            isAdmin: false,
            isViewer: true,
          },
          options
        );
        await CollectionUser.update(
          {
            permission: CollectionPermission.Read,
          },
          {
            ...options,
            where: {
              userId: this.id,
            },
          }
        );
      }

      return undefined;
    } else {
      throw ValidationError("At least one admin is required");
    }
  };

  promote = () =>
    this.update({
      isAdmin: true,
      isViewer: false,
    });

  // hooks

  @BeforeDestroy
  static removeIdentifyingInfo = async (
    model: User,
    options: { transaction: Transaction }
  ) => {
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
    model.lastActiveIp = null;
    model.lastSignedInIp = null;

    // this shouldn't be needed once this issue is resolved:
    // https://github.com/sequelize/sequelize/issues/9318
    await model.save({
      hooks: false,
      transaction: options.transaction,
    });
  };

  @BeforeCreate
  static setRandomJwtSecret = (model: User) => {
    model.jwtSecret = crypto.randomBytes(64).toString("hex");
  };

  @AfterUpdate
  static deletePreviousAvatar = async (model: User) => {
    if (
      model.previous("avatarUrl") &&
      model.previous("avatarUrl") !== model.avatarUrl
    ) {
      const attachmentIds = parseAttachmentIds(
        model.previous("avatarUrl"),
        true
      );
      if (!attachmentIds.length) {
        return;
      }

      const attachment = await Attachment.findOne({
        where: {
          id: attachmentIds[0],
          teamId: model.teamId,
          userId: model.id,
        },
      });

      if (attachment) {
        await DeleteAttachmentTask.schedule({
          attachmentId: attachment.id,
          teamId: model.id,
        });
      }
    }
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
    const [results] = await this.sequelize.query(countSql, {
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
    } = results;

    return {
      active: parseInt(counts.activeCount),
      admins: parseInt(counts.adminCount),
      viewers: parseInt(counts.viewerCount),
      all: parseInt(counts.count),
      invited: parseInt(counts.invitedCount),
      suspended: parseInt(counts.suspendedCount),
    };
  };
}

export default User;
