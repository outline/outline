/* eslint-disable @typescript-eslint/ban-types */
import isEqual from "fast-deep-equal";
import isArray from "lodash/isArray";
import isObject from "lodash/isObject";
import pick from "lodash/pick";
import {
  CreateOptions,
  CreationAttributes,
  DataTypes,
  FindOptions,
  InstanceDestroyOptions,
  InstanceUpdateOptions,
  ModelStatic,
  NonAttribute,
  SaveOptions,
} from "sequelize";
import {
  AfterCreate,
  AfterDestroy,
  AfterUpdate,
  BeforeCreate,
  Model as SequelizeModel,
} from "sequelize-typescript";
import Logger from "@server/logging/Logger";
import { Replace, APIContext } from "@server/types";
import { getChangsetSkipped } from "../decorators/Changeset";

class Model<
  TModelAttributes extends {} = any,
  TCreationAttributes extends {} = TModelAttributes
> extends SequelizeModel<TModelAttributes, TCreationAttributes> {
  /**
   * The namespace to use for events, if none is provided an event will not be created
   * during the migration period. In the future this may default to the table name.
   */
  static eventNamespace: string | undefined;

  /**
   * Validates this instance, and if the validation passes, persists it to the database.
   */
  public saveWithCtx(ctx: APIContext) {
    this.cacheChangeset();
    return this.save(ctx.context as SaveOptions);
  }

  /**
   * This is the same as calling `set` and then calling `save`.
   */
  public updateWithCtx(ctx: APIContext, keys: Partial<TModelAttributes>) {
    this.cacheChangeset();
    return this.update(keys, ctx.context as InstanceUpdateOptions);
  }

  /**
   * Destroy the row corresponding to this instance. Depending on your setting for paranoid, the row will
   * either be completely deleted, or have its deletedAt timestamp set to the current time.
   */
  public destroyWithCtx(ctx: APIContext) {
    return this.destroy(ctx.context as InstanceDestroyOptions);
  }

  /**
   * Builds a new model instance and calls save on it.
   */
  public static createWithCtx<M extends Model>(
    this: ModelStatic<M>,
    ctx: APIContext,
    values?: CreationAttributes<M>
  ) {
    return this.create(values, ctx.context as CreateOptions);
  }

  @BeforeCreate
  static async beforeCreateEvent<T extends Model>(model: T) {
    model.cacheChangeset();
  }

  @AfterCreate
  static async afterCreateEvent<T extends Model>(
    model: T,
    context: APIContext["context"]
  ) {
    await this.insertEvent("create", model, context);
  }

  @AfterUpdate
  static async afterUpdateEvent<T extends Model>(
    model: T,
    context: APIContext["context"]
  ) {
    await this.insertEvent("update", model, context);
  }

  @AfterDestroy
  static async afterDestroyEvent<T extends Model>(
    model: T,
    context: APIContext["context"]
  ) {
    await this.insertEvent("delete", model, context);
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
    context: APIContext["context"] & InstanceUpdateOptions
  ) {
    const namespace = this.eventNamespace;
    const models = this.sequelize!.models;

    // If no namespace is defined, don't create an event
    if (!namespace || context.silent) {
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
        name: `${namespace}.${name}`,
        modelId: model.id,
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
    query: Replace<FindOptions<T>, "limit", "batchLimit">,
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
    } while (results.length >= mappedQuery.limit);
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
    this.previousChangeset = this.changeset;
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
