/* eslint-disable @typescript-eslint/ban-types */
import isEqual from "fast-deep-equal";
import isArray from "lodash/isArray";
import isObject from "lodash/isObject";
import pick from "lodash/pick";
import {
  CreateOptions,
  CreationAttributes,
  FindOptions,
  InstanceDestroyOptions,
  InstanceUpdateOptions,
  ModelStatic,
  NonAttribute,
} from "sequelize";
import {
  AfterCreate,
  AfterDestroy,
  AfterUpdate,
  Model as SequelizeModel,
} from "sequelize-typescript";
import Logger from "@server/logging/Logger";
import { Replace, APIContext } from "@server/types";

class Model<
  TModelAttributes extends {} = any,
  TCreationAttributes extends {} = TModelAttributes
> extends SequelizeModel<TModelAttributes, TCreationAttributes> {
  /**
   * The namespace to use for events, if none is provided the table name is used.
   */
  static eventNamespace: string | undefined;

  /**
   * The properties to include in the event data when this model is mutated.
   */
  static eventData: string[] = [];

  /**
   * This is the same as calling `set` and then calling `save`.
   */
  public updateWithCtx(ctx: APIContext, keys: Partial<TModelAttributes>) {
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
    context: APIContext["context"]
  ) {
    // If no eventData is defined, don't create an event
    if (this.eventData.length === 0) {
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

    const models = this.sequelize!.models;
    const namespace = this.eventNamespace || this.tableName;

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
        actorId: context.auth?.user.id,
        ip: context.ip,
        data: pick(model, this.eventData),
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
   * Returns the attributes that have changed since the last save and their previous values.
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

    for (const change of changes) {
      const previous = this.previous(change);
      const current = this.getDataValue(change);

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
}

export default Model;
