import pick from "lodash/pick";
import { FindOptions } from "sequelize";
import {
  AfterCreate,
  AfterDestroy,
  AfterUpdate,
  Model as SequelizeModel,
} from "sequelize-typescript";
import Logger from "@server/logging/Logger";
import { APIContext } from "@server/types";

class Model extends SequelizeModel {
  /**
   * The namespace to use for events, if none is provided the table name is used.
   */
  static eventNamespace: string | undefined;

  /**
   * The properties to include in the event data when this model is mutated.
   */
  static eventData: string[] = [];

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
    query: FindOptions<T>,
    callback: (results: Array<T>, query: FindOptions<T>) => Promise<void>
  ) {
    if (!query.offset) {
      query.offset = 0;
    }
    if (!query.limit) {
      query.limit = 10;
    }
    let results;

    do {
      // @ts-expect-error this T
      results = await this.findAll<T>(query);
      await callback(results, query);
      query.offset += query.limit;
    } while (results.length >= query.limit);
  }
}

export default Model;
