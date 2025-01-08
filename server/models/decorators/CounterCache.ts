import isNil from "lodash/isNil";
import { InferAttributes, Transactionable } from "sequelize";
import { ModelClassGetter } from "sequelize-typescript";
import env from "@server/env";
import { CacheHelper } from "@server/utils/CacheHelper";
import type Model from "../base/Model";

const key = Symbol("count");

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

    if (!Reflect.hasMetadata(key, target)) {
      Reflect.defineMetadata(key, {}, target);
    }

    const recalculateCache = async (
      model: InstanceType<T>,
      { transaction }: Transactionable
    ) => {
      const foreignKeyValue = model[
        options.foreignKey as keyof typeof model
      ] as string;
      const cacheKey = `${cacheKeyPrefix}:${foreignKeyValue}`;

      const count = await modelClass.count({
        where: {
          [options.foreignKey]: foreignKeyValue,
        },
        transaction,
      });

      const counter: Record<string, number> = Reflect.getMetadata(key, target);
      counter[foreignKeyValue] = count;

      if (transaction) {
        // 'findOrCreate' creates a new transaction always, with the transaction from the middleware as its parent.
        // We want to use the parent transaction, otherwise the 'afterCommit' hook will never fire in this case.
        // See: https://github.com/sequelize/sequelize/issues/17452
        (transaction?.parent || transaction).afterCommit(
          () => void CacheHelper.setData(cacheKey, count)
        );
        return;
      }

      void CacheHelper.setData(cacheKey, count);
    };

    // Add hooks after model is added to the sequelize instance
    setImmediate(() => {
      modelClass.addHook("afterCreate", recalculateCache);
      modelClass.addHook("afterDestroy", recalculateCache);
    });

    return {
      get() {
        const counter: Record<string, number> = Reflect.getMetadata(
          key,
          target
        );

        if (counter[this.id]) {
          return counter[this.id];
        }

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
