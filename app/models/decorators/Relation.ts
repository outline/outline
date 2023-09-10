import invariant from "invariant";
import type BaseModel from "../BaseModel";

type RelationOptions = {
  /** Whether this relation is required */
  required?: boolean;
};

/**
 * A decorator that records this key as a relation field on the model.
 * Properties decorated with @Relation will merge and read their data from
 * the associated store.
 *
 * @param classResolver A function that returns the class of the relation
 * @param options Optional options for the relation definition
 */
export default function Relation<T extends typeof BaseModel>(
  classResolver: () => T,
  options?: RelationOptions
) {
  return function (target: any, propertyKey: string) {
    const idKey = `${String(propertyKey)}Id`;
    const relationClass = classResolver();
    const relationClassName = relationClass.name;

    Object.defineProperty(target, propertyKey, {
      get() {
        const id: string | undefined = this[idKey];

        if (!id) {
          return undefined;
        }

        const store =
          this.store.rootStore[`${relationClassName.toLowerCase()}s`];
        invariant(store, `Store for ${relationClassName} not found`);

        return store.get(id);
      },
      set(newValue: BaseModel | Partial<BaseModel> | undefined) {
        this[idKey] = newValue ? newValue.id : undefined;

        if (newValue) {
          const store =
            this.store.rootStore[`${relationClassName.toLowerCase()}s`];
          invariant(store, `Store for ${relationClassName} not found`);

          store.add(newValue);
        } else if (options?.required) {
          throw new Error(
            `Cannot set required ${String(propertyKey)} to undefined`
          );
        }
      },
      enumerable: true,
      configurable: true,
    });
  };
}
