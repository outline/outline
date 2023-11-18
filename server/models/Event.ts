import type { SaveOptions, WhereOptions } from "sequelize";
import {
  ForeignKey,
  AfterSave,
  BeforeCreate,
  BelongsTo,
  Column,
  IsIP,
  IsUUID,
  Table,
  DataType,
  Length,
} from "sequelize-typescript";
import { globalEventQueue } from "../queues";
import { Event as TEvent } from "../types";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "events", modelName: "event", updatedAt: false })
@Fix
class Event extends IdModel {
  @IsUUID(4)
  @Column(DataType.UUID)
  modelId: string | null;

  @Length({
    max: 255,
    msg: "name must be 255 characters or less",
  })
  @Column
  name: string;

  @IsIP
  @Column
  ip: string | null;

  @Column(DataType.JSONB)
  data: Record<string, any> | null;

  // hooks

  @BeforeCreate
  static cleanupIp(model: Event) {
    if (model.ip) {
      // cleanup IPV6 representations of IPV4 addresses
      model.ip = model.ip.replace(/^::ffff:/, "");
    }
  }

  @AfterSave
  static async enqueue(model: Event, options: SaveOptions<Event>) {
    if (options.transaction) {
      options.transaction.afterCommit(() => void globalEventQueue.add(model));
      return;
    }
    void globalEventQueue.add(model);
  }

  // associations

  @BelongsTo(() => User, "userId")
  user: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string | null;

  @BelongsTo(() => Document, "documentId")
  document: Document | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;

  @BelongsTo(() => User, "actorId")
  actor: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  actorId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string | null;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  /*
   * Schedule can be used to send events into the event system without recording
   * them in the database or audit trail – consider using a task instead.
   */
  static schedule(event: Partial<Event>) {
    const now = new Date();
    return globalEventQueue.add(
      this.build({
        createdAt: now,
        ...event,
      })
    );
  }

  /**
   * Find the latest event matching the where clause
   *
   * @param where The options to match against
   * @returns A promise resolving to the latest event or null
   */
  static findLatest(where: WhereOptions) {
    return this.findOne({
      where,
      order: [["createdAt", "DESC"]],
    });
  }

  static ACTIVITY_EVENTS: TEvent["name"][] = [
    "collections.create",
    "collections.delete",
    "collections.move",
    "collections.permission_changed",
    "documents.publish",
    "documents.unpublish",
    "documents.archive",
    "documents.unarchive",
    "documents.move",
    "documents.delete",
    "documents.permanent_delete",
    "documents.restore",
    "revisions.create",
    "users.create",
  ];

  static AUDIT_EVENTS: TEvent["name"][] = [
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
    "documents.create",
    "documents.publish",
    "documents.update",
    "documents.archive",
    "documents.unarchive",
    "documents.move",
    "documents.delete",
    "documents.permanent_delete",
    "documents.restore",
    "groups.create",
    "groups.update",
    "groups.delete",
    "pins.create",
    "pins.update",
    "pins.delete",
    "revisions.create",
    "shares.create",
    "shares.update",
    "shares.revoke",
    "teams.update",
    "users.create",
    "users.update",
    "users.signin",
    "users.signout",
    "users.promote",
    "users.demote",
    "users.invite",
    "users.suspend",
    "users.activate",
    "users.delete",
    "fileOperations.create",
    "fileOperations.delete",
    "webhookSubscriptions.create",
    "webhookSubscriptions.delete",
  ];
}

export default Event;
