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

    return this.sequelize?.models.event.create(
      {
        name: `${this.eventNamespace}.${name}`,
        modelId: model.id,
        teamId: context.auth?.user.teamId,
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
