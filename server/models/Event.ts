import type {
  CreateOptions,
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
  WhereOptions,
} from "sequelize";
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
import { APIContext, AuthenticationType } from "../types";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "events", modelName: "event", updatedAt: false })
@Fix
class Event extends IdModel<
  InferAttributes<Event>,
  Partial<InferCreationAttributes<Event>>
> {
  @IsUUID(4)
  @Column(DataType.UUID)
  modelId: string | null;

  /** The name of the event. */
  @Length({
    max: 255,
    msg: "name must be 255 characters or less",
  })
  @Column(DataType.STRING)
  name: string;

  /** The originating IP address of the event. */
  @IsIP
  @Column
  ip: string | null;

  /** The type of authentication used to create the event. */
  @Column(DataType.ENUM(...Object.values(AuthenticationType)))
  authType: AuthenticationType | null;

  /**
   * Metadata associated with the event, previously used for storing some changed attributes.
   * Note that the `data` column will be visible to the client and API requests.
   */
  @Column(DataType.JSONB)
  data: Record<string, any> | null;

  /**
   * The changes made to the model – gradually moving to this column away from `data` which can be
   * used for arbitrary data associated with the event.
   */
  @Column(DataType.JSONB)
  changes: Record<string, any> | null;

  // hooks

  @BeforeCreate
  static cleanupIp(model: Event) {
    if (model.ip) {
      // cleanup IPV6 representations of IPV4 addresses
      model.ip = model.ip.replace(/^::ffff:/, "");
    }
  }

  @AfterSave
  static async enqueue(
    model: Event,
    options: SaveOptions<InferAttributes<Event>>
  ) {
    if (options.transaction) {
      // 'findOrCreate' creates a new transaction always, and the transaction from the middleware is set as its parent.
      // We want to use the parent transaction, otherwise the 'afterCommit' hook will never fire in this case.
      // See: https://github.com/sequelize/sequelize/issues/17452
      (options.transaction.parent || options.transaction).afterCommit(
        () => void globalEventQueue.add(model)
      );
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

  /**
   * Create and persist new event from request context
   *
   * @param ctx The request context to use
   * @param attributes The event attributes
   * @returns A promise resolving to the new event
   */
  static createFromContext(
    ctx: APIContext,
    attributes: Omit<Partial<Event>, "ip" | "teamId" | "actorId"> = {},
    defaultAttributes: Pick<Partial<Event>, "ip" | "teamId" | "actorId"> = {},
    options?: CreateOptions<InferAttributes<Event>>
  ) {
    const user = ctx.state.auth?.user;
    const authType = ctx.state.auth?.type;

    return this.create(
      {
        ...attributes,
        actorId: user?.id || defaultAttributes.actorId,
        teamId: user?.teamId || defaultAttributes.teamId,
        ip: ctx.request.ip || defaultAttributes.ip,
        authType,
      },
      {
        transaction: ctx.state.transaction,
        ...options,
      }
    );
  }
}

export default Event;
