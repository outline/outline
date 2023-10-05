import invariant from "invariant";
import type Model from "../base/Model";

type RelationOptions = {
  /** Whether this relation is required */
  required?: boolean;
  /** Behavior of relationship on deletion */
  onDelete: "cascade" | "null" | "ignore";
};

type RelationProperties = {
  /** The name of the property on the model that stores the ID of the relation */
  idKey: string;
  /** A function that returns the class of the relation */
  relationClassResolver: () => typeof Model;
  /** Options for the relation */
  options: RelationOptions;
};

type InverseRelationProperties = RelationProperties & {
  /** The name of the model class that owns this relation */
  modelName: string;
};

const relations = new Map<string, Map<string, RelationProperties>>(new Map());

/**
 * Returns the inverse relation properties for the given model class.
 *
 * @param targetClass The model class to get inverse relations for.
 * @returns A map of inverse relation properties keyed by the property name.
 */
export const getInverseRelationsForModelClass = (targetClass: typeof Model) => {
  const inverseRelations = new Map<string, InverseRelationProperties>();

  relations.forEach((relation, modelName) => {
    relation.forEach((properties, propertyName) => {
      if (properties.relationClassResolver().name === targetClass.name) {
        inverseRelations.set(propertyName, {
          ...properties,
          modelName,
        });
      }
    });
  });

  return inverseRelations;
};

/**
 * A decorator that records this key as a relation field on the model.
 * Properties decorated with @Relation will merge and read their data from
 * the associated store.
 *
 * @param classResolver A function that returns the class of the relation
 * @param options Optional options for the relation definition
 */
export default function Relation<T extends typeof Model>(
  classResolver: () => T,
  options?: RelationOptions
) {
  return function (target: any, propertyKey: string) {
    const idKey = `${String(propertyKey)}Id`;

    // If the relation has options provided then register them in a map for later lookup. We can use
    // this to determine how to update relations when a model is deleted.
    if (options) {
      const configForClass =
        relations.get(target.constructor.name) || new Map();
      configForClass.set(propertyKey, {
        options,
        relationClassResolver: classResolver,
        idKey,
      });
      relations.set(target.constructor.name, configForClass);
    }

    Object.defineProperty(target, propertyKey, {
      get() {
        const id: string | undefined = this[idKey];

        if (!id) {
          return undefined;
        }

        const relationClassName = classResolver().name;
        const store =
          this.store.rootStore[`${relationClassName.toLowerCase()}s`];
        invariant(store, `Store for ${relationClassName} not found`);

        return store.get(id);
      },
      set(newValue: Model | Partial<Model> | undefined) {
        this[idKey] = newValue ? newValue.id : undefined;

        if (newValue) {
          const relationClassName = classResolver().name;
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
