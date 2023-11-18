import { FindOptions } from "sequelize";
import { Model as SequelizeModel } from "sequelize-typescript";

class Model extends SequelizeModel {
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
