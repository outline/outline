import { isNil } from "es-toolkit/compat";
import type {
  IncludeOptions,
  InferAttributes,
  Transaction,
  WhereOptions,
} from "sequelize";
import type { ModelClassGetter } from "sequelize-typescript";
import { CacheHelper } from "@server/utils/CacheHelper";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import type Model from "../base/Model";

type RelationOptions = {
  /** Reference name used in cache key. */
  as: string;
  /** The foreign key to use for the relationship query. */
  foreignKey: string;
  /** Optional include used in the count query for filtering through associations. */
  include?: IncludeOptions[];
  /** Optional additional where clause used in the count query. */
  where?: WhereOptions;
};

/**
 * A decorator that caches the count of a relationship and registers model lifecycle hooks
 * to invalidate the cache when models are added or removed from the relationship.
 */
export function CounterCache<
  TCreationAttributes extends InferAttributes<Model>,
  TModelAttributes extends InferAttributes<Model>,
  T extends typeof Model,
>(
  classResolver: ModelClassGetter<TCreationAttributes, TModelAttributes>,
  options: RelationOptions
) {
  return function (target: InstanceType<T>, _propertyKey: string) {
    const modelClass = classResolver() as typeof Model;
    const modelName = target.constructor.name;

    const buildCacheKey = (id: unknown) =>
      RedisPrefixHelper.getCounterCacheKey(modelName, options.as, String(id));

    const computeCount = (id: unknown) =>
      modelClass.count({
        where: { [options.foreignKey]: id, ...(options.where ?? {}) },
        include: options.include,
        distinct: !!options.include,
      });

    const invalidate = async (
      model: InstanceType<T>,
      hookOptions?: { transaction?: Transaction | null }
    ) => {
      const cacheKey = buildCacheKey(
        model[options.foreignKey as keyof typeof model]
      );
      const remove = async () => {
        await CacheHelper.removeData(cacheKey);
      };

      // Defer invalidation until after the transaction commits so that a
      // rollback does not leave the cache out of sync, and so that a stale
      // pre-commit count is not re-cached by a concurrent reader. Walk to
      // the parent transaction when nested so the callback isn't lost when
      // the savepoint releases without committing the outer transaction.
      if (hookOptions?.transaction) {
        const transaction =
          hookOptions.transaction.parent || hookOptions.transaction;
        transaction.afterCommit(remove);
      } else {
        await remove();
      }
    };

    // The model class is not added to a Sequelize instance until the database
    // module is first imported, which is later than decorator evaluation. Poll
    // until the model is ready, then register the hooks. Use unref() so the
    // pending immediate does not keep the event loop alive in environments
    // (such as tests) where the database is never initialized.
    const registerHooks = () => {
      if (!modelClass.sequelize) {
        setImmediate(registerHooks).unref();
        return;
      }
      modelClass.addHook("afterCreate", invalidate);
      modelClass.addHook("afterDestroy", invalidate);
    };
    setImmediate(registerHooks).unref();

    return {
      get() {
        const cacheKey = buildCacheKey(this.id);

        return CacheHelper.getData<number>(cacheKey).then((value) => {
          if (!isNil(value)) {
            return value;
          }

          return computeCount(this.id).then((count) => {
            void CacheHelper.setData(cacheKey, count);
            return count;
          });
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TS rejects PropertyDescriptor as legacy decorator return type; descriptor is consumed by Sequelize at runtime.
    } as any;
  };
}
