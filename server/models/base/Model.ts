/* eslint-disable @typescript-eslint/ban-types */
import isEqual from "fast-deep-equal";
import isArray from "lodash/isArray";
import isObject from "lodash/isObject";
import pick from "lodash/pick";
import {
  Attributes,
  CreationAttributes,
  DataTypes,
  FindOptions,
  FindOrCreateOptions,
  ModelStatic,
  NonAttribute,
  SaveOptions,
} from "sequelize";
import {
  AfterCreate,
  AfterDestroy,
  AfterRestore,
  AfterUpdate,
  AfterUpsert,
  BeforeSave,
  Model as SequelizeModel,
} from "sequelize-typescript";
import Logger from "@server/logging/Logger";
import { Replace, APIContext } from "@server/types";
import { getChangsetSkipped } from "../decorators/Changeset";

type EventOverrideOptions = {
  /** Override the default event name. */
  name?: string;
  /** Additional data to publish in the event. */
  data?: Record<string, unknown>;
};

type EventOptions = EventOverrideOptions & {
  /**
   * Whether to publish event to the job queue. Defaults to true when using any `withCtx` methods.
   */
  create: boolean;
};

export type HookContext = APIContext["context"] & { event?: EventOptions };

class Model<
  TModelAttributes extends {} = any,
  TCreationAttributes extends {} = TModelAttributes
> extends SequelizeModel<TModelAttributes, TCreationAttributes> {
  /**
   * The namespace to use for events - defaults to the table name if none is provided.
   */
  static eventNamespace: string | undefined;

  /**
   * Validates this instance, and if the validation passes, persists it to the database.
   */
  public saveWithCtx<M extends Model>(
    ctx: APIContext,
    options?: SaveOptions<Attributes<M>>,
    eventOpts?: EventOverrideOptions
  ) {
    const hookContext: HookContext = {
      ...ctx.context,
      event: {
        ...eventOpts,
        create: true,
      },
    };
    return this.save({ ...options, ...hookContext });
  }

  /**
   * This is the same as calling `set` and then calling `save`.
   */
  public updateWithCtx(
    ctx: APIContext,
    keys: Partial<TModelAttributes>,
    eventOpts?: EventOverrideOptions
  ) {
    const hookContext: HookContext = {
      ...ctx.context,
      event: {
        ...eventOpts,
        create: true,
      },
    };
    this.set(keys);
    return this.save(hookContext);
  }

  /**
   * Destroy the row corresponding to this instance. Depending on your setting for paranoid, the row will
   * either be completely deleted, or have its deletedAt timestamp set to the current time.
   */
  public destroyWithCtx(ctx: APIContext, eventOpts?: EventOverrideOptions) {
    const hookContext: HookContext = {
      ...ctx.context,
      event: {
        ...eventOpts,
        create: true,
      },
    };
    return this.destroy(hookContext);
  }

  /**
   * Restore the row corresponding to this instance. Only available for paranoid models.
   */
  public restoreWithCtx(ctx: APIContext, eventOpts?: EventOverrideOptions) {
    const hookContext: HookContext = {
      ...ctx.context,
      event: {
        ...eventOpts,
        create: true,
      },
    };
    return this.restore(hookContext);
  }

  /**
   * Find a row that matches the query, or build and save the row if none is found
   * The successful result of the promise will be (instance, created) - Make sure to use `.then(([...]))`
   */
  public static findOrCreateWithCtx<M extends Model>(
    this: ModelStatic<M>,
    ctx: APIContext,
    options: FindOrCreateOptions<Attributes<M>, CreationAttributes<M>>,
    eventOpts?: EventOverrideOptions
  ) {
    const hookContext: HookContext = {
      ...ctx.context,
      event: {
        ...eventOpts,
        create: true,
      },
    };
    return this.findOrCreate({
      ...options,
      ...hookContext,
    });
  }

  /**
   * Builds a new model instance and calls save on it.
   */
  public static createWithCtx<M extends Model>(
    this: ModelStatic<M>,
    ctx: APIContext,
    values?: CreationAttributes<M>,
    eventOpts?: EventOverrideOptions
  ) {
    const hookContext: HookContext = {
      ...ctx.context,
      event: {
        ...eventOpts,
        create: true,
      },
    };
    return this.create(values, hookContext);
  }

  @BeforeSave
  static async beforeSaveEvent<T extends Model>(model: T) {
    model.cacheChangeset();
  }

  @AfterCreate
  static async afterCreateEvent<T extends Model>(
    model: T,
    context: HookContext
  ) {
    await this.insertEvent("create", model, context);
  }

  @AfterUpsert
  static async afterUpsertEvent<T extends Model>(
    model: T,
    context: HookContext
  ) {
    await this.insertEvent("create", model, context);
  }

  @AfterUpdate
  static async afterUpdateEvent<T extends Model>(
    model: T,
    context: HookContext
  ) {
    await this.insertEvent("update", model, context);
  }

  @AfterDestroy
  static async afterDestroyEvent<T extends Model>(
    model: T,
    context: HookContext
  ) {
    await this.insertEvent("delete", model, context);
  }

  @AfterRestore
  static async afterRestoreEvent<T extends Model>(
    model: T,
    context: HookContext
  ) {
    await this.insertEvent("create", model, context);
  }

  /**
   * Insert an event into the database recording a mutation to this model.
   *
   * @param name The name of the event.
   * @param model The model that was mutated.
   * @param context The API context.
   */
  protected static async insertEvent<T extends Model>(
    name: string,
    model: T,
    context: HookContext
  ) {
    const namespace = this.eventNamespace ?? this.tableName;
    const models = this.sequelize!.models;

    if (!context.event?.create) {
      return;
    }

    if (!context.transaction) {
      Logger.warn("No transaction provided to insertEvent", {
        modelId: model.id,
      });
    }

    if (!context.ip) {
      Logger.warn("No ip provided to insertEvent", {
        modelId: model.id,
      });
    }

    return models.event.create(
      {
        name: `${namespace}.${context.event.name ?? name}`,
        modelId: "modelId" in model ? model.modelId : model.id,
        collectionId:
          "collectionId" in model
            ? model.collectionId
            : model instanceof models.collection
            ? model.id
            : undefined,
        documentId:
          "documentId" in model
            ? model.documentId
            : model instanceof models.document
            ? model.id
            : undefined,
        userId:
          "userId" in model
            ? model.userId
            : model instanceof models.user
            ? model.id
            : undefined,
        teamId:
          "teamId" in model
            ? model.teamId
            : model instanceof models.team
            ? model.id
            : context.auth?.user.teamId,
        actorId: context.auth?.user?.id,
        authType: context.auth?.type,
        ip: context.ip,
        changes: model.previousChangeset,
        data: context.event.data,
      },
      {
        transaction: context.transaction,
      }
    );
  }

  /**
   * Find all models in batches, calling the callback function for each batch.
   *
   * @param query The query options.
   * @param callback The function to call for each batch of results
   */
  static async findAllInBatches<T extends Model>(
    query: Replace<FindOptions<T>, "limit", "batchLimit"> & {
      /** The maximum number of results to return, after which the query will stop. */
      totalLimit?: number;
    },
    callback: (results: Array<T>, query: FindOptions<T>) => Promise<void>
  ) {
    const mappedQuery = {
      ...query,
      offset: query.offset ?? 0,
      limit: query.batchLimit ?? 10,
    };

    let results;

    do {
      // @ts-expect-error this T
      results = await this.findAll<T>(mappedQuery);
      await callback(results, mappedQuery);
      mappedQuery.offset += mappedQuery.limit;
    } while (
      results.length >= mappedQuery.limit &&
      (mappedQuery.totalLimit ?? Infinity) > mappedQuery.offset
    );
  }

  /**
   * Returns a representation of the attributes that have changed since the last save and their previous values.
   *
   * @returns An object with `attributes` and `previousAttributes` keys.
   */
  public get changeset(): NonAttribute<{
    attributes: Partial<TModelAttributes>;
    previous: Partial<TModelAttributes>;
  }> {
    const changes = this.changed() as Array<keyof TModelAttributes> | false;
    const attributes: Partial<TModelAttributes> = {};
    const previousAttributes: Partial<TModelAttributes> = {};

    if (!changes) {
      return {
        attributes,
        previous: previousAttributes,
      };
    }

    const virtualFields = (this.constructor as typeof Model).virtualFields;
    const blobFields = (this.constructor as typeof Model).blobFields;
    const skippedFields = getChangsetSkipped(this);

    for (const change of changes) {
      const previous = this.previous(change);
      const current = this.getDataValue(change);

      if (
        virtualFields.includes(String(change)) ||
        blobFields.includes(String(change)) ||
        skippedFields.includes(String(change))
      ) {
        continue;
      }

      if (
        isObject(previous) &&
        isObject(current) &&
        !isArray(previous) &&
        !isArray(current)
      ) {
        const difference = Object.keys(previous)
          .concat(Object.keys(current))
          // @ts-expect-error TODO
          .filter((key) => !isEqual(previous[key], current[key]));

        previousAttributes[change] = pick(
          previous,
          difference
        ) as TModelAttributes[keyof TModelAttributes];
        attributes[change] = pick(
          current,
          difference
        ) as TModelAttributes[keyof TModelAttributes];
      } else {
        previousAttributes[change] = previous;
        attributes[change] = current;
      }
    }

    return {
      attributes,
      previous: previousAttributes,
    };
  }

  /**
   * Cache the current changeset for later use.
   */
  protected cacheChangeset() {
    const previous = this.changeset;

    if (
      Object.keys(previous.attributes).length > 0 ||
      Object.keys(previous.previous).length > 0
    ) {
      this.previousChangeset = previous;
    }
  }

  /**
   * Returns the virtual fields for this model.
   */
  protected static get virtualFields() {
    const attrs = this.rawAttributes;
    return Object.keys(attrs).filter(
      (attr) => attrs[attr].type instanceof DataTypes.VIRTUAL
    );
  }

  /**
   * Returns the blob fields for this model.
   */
  protected static get blobFields() {
    const attrs = this.rawAttributes;
    return Object.keys(attrs).filter(
      (attr) => attrs[attr].type instanceof DataTypes.BLOB
    );
  }

  private previousChangeset: NonAttribute<{
    attributes: Partial<TModelAttributes>;
    previous: Partial<TModelAttributes>;
  }> | null;
}

export default Model;
