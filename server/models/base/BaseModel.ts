import { FindOptions } from "sequelize";
import { Model } from "sequelize-typescript";

class BaseModel extends Model {
  static async findAllInBatches<T extends BaseModel>(
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

export default BaseModel;
