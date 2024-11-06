import isNil from "lodash/isNil";
import { InferAttributes } from "sequelize";
import { ModelClassGetter } from "sequelize-typescript";
import env from "@server/env";
import { CacheHelper } from "@server/utils/CacheHelper";
import type Model from "../base/Model";

type RelationOptions = {
  /** Reference name used in cache key. */
  as: string;
  /** The foreign key to use for the relationship query. */
  foreignKey: string;
};

/**
 * A decorator that caches the count of a relationship and registers model lifecycle hooks
 * to invalidate the cache when models are added or removed from the relationship.
 */
export function CounterCache<
  TCreationAttributes extends InferAttributes<Model>,
  TModelAttributes extends InferAttributes<Model>,
  T extends typeof Model
>(
  classResolver: ModelClassGetter<TCreationAttributes, TModelAttributes>,
  options: RelationOptions
) {
  return function (target: InstanceType<T>, _propertyKey: string) {
    if (env.isTest) {
      // No-op cache in test environment
      return;
    }
    const modelClass = classResolver() as typeof Model;
    const cacheKeyPrefix = `count:${target.constructor.name}:${options.as}`;

    // Add hooks after model is added to the sequelize instance
    setImmediate(() => {
      const recalculateCache =
        (offset: number) => async (model: InstanceType<T>) => {
          const cacheKey = `${cacheKeyPrefix}:${
            model[options.foreignKey as keyof typeof model]
          }`;

          const count = await modelClass.count({
            where: {
              [options.foreignKey]:
                model[options.foreignKey as keyof typeof model],
            },
          });
          await CacheHelper.setData(cacheKey, count + offset);
        };

      // Because the transaction is not complete until after the response is sent, we need to
      // offset the count by 1 to account for the record. TODO: Need to find a better way to handle
      // this as a rollback would not decrement the count.
      modelClass.addHook("afterCreate", recalculateCache(1));
      modelClass.addHook("afterDestroy", recalculateCache(-1));
    });

    return {
      get() {
        const cacheKey = `${cacheKeyPrefix}:${this.id}`;

        return CacheHelper.getData<number>(cacheKey).then((value) => {
          if (!isNil(value)) {
            return value;
          }

          // calculate and cache count
          return modelClass
            .count({
              where: {
                [options.foreignKey]: this.id,
              },
            })
            .then((count) => {
              void CacheHelper.setData(cacheKey, count);
              return count;
            });
        });
      },
    } as any;
  };
}
