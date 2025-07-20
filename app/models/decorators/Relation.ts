import invariant from "invariant";
import { singular } from "pluralize";
import type Model from "../base/Model";
import Logger from "~/utils/Logger";

/** The behavior of a relationship on deletion */
type DeleteBehavior = "cascade" | "null" | "ignore";
/** The behavior of a relationship on archival */
type ArchiveBehavior = "cascade" | "null" | "ignore";

type RelationOptions<T = Model> = {
  /** Whether this relation is required. */
  required?: boolean;
  /** If true, this relation is an array of IDs (one-to-many). */
  multiple?: boolean;
  /** Behavior of this model when relationship is deleted. */
  onDelete?: DeleteBehavior | ((item: T) => DeleteBehavior);
  /** Behavior of this model when relationship is archived. */
  onArchive?: ArchiveBehavior | ((item: T) => ArchiveBehavior);
};

type RelationProperties<T = Model> = {
  /** The name of the property on the model that stores the ID of the relation. */
  idKey: keyof T;
  /** A function that returns the class of the relation. */
  relationClassResolver: () => typeof Model;
  /** Options for the relation. */
  options: RelationOptions<T>;
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
      try {
        const resolvedClass = properties.relationClassResolver();
        if (
          resolvedClass &&
          resolvedClass.modelName &&
          resolvedClass.modelName === targetClass.modelName
        ) {
          inverseRelations.set(`${modelName}-${propertyName}`, {
            ...properties,
            modelName,
          });
        }
      } catch (error) {
        Logger.error(
          `Error resolving relation ${modelName}.${propertyName} for target ${targetClass.modelName}:`,
          error
        );
      }
    });
  });

  return inverseRelations;
};

export const getRelationsForModelClass = (targetClass: typeof Model) =>
  relations.get(targetClass.modelName);

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
    const idKey = options?.multiple
      ? `${String(singular(propertyKey))}Ids`
      : `${String(propertyKey)}Id`;

    // If the relation has options provided then register them in a map for later lookup. We can use
    // this to determine how to update relations when a model is deleted.
    //
    // TODO: requestAnimationFrame is a temporary solution to a bug in rolldown compiled code that
    // will place static methods _after_ decorators. Temporary fix is to delay the registration until
    // the next frame.
    requestAnimationFrame(() => {
      if (options) {
        const configForClass =
          relations.get(target.constructor.modelName) || new Map();
        configForClass.set(propertyKey, {
          options,
          relationClassResolver: classResolver,
          idKey,
        });
        relations.set(target.constructor.modelName, configForClass);
      }
    });

    Object.defineProperty(target, propertyKey, {
      get() {
        const relationClassName = classResolver().modelName;
        const store =
          this.store.rootStore.getStoreForModelName(relationClassName);
        invariant(store, `Store for ${relationClassName} not found`);

        if (options?.multiple) {
          const ids: string[] | undefined = this[idKey];
          if (!Array.isArray(ids) || ids.length === 0) {
            return [];
          }
          return ids.map((id) => store.get(id)).filter(Boolean);
        } else {
          const id: string | undefined = this[idKey];
          if (!id) {
            return undefined;
          }
          return store.get(id);
        }
      },
      set(
        newValue:
          | Model
          | Partial<Model>
          | Array<Model | Partial<Model>>
          | undefined
      ) {
        if (options?.multiple) {
          if (!newValue) {
            this[idKey] = [];
            if (options?.required) {
              throw new Error(
                `Cannot set required ${String(
                  propertyKey
                )} to undefined or empty array`
              );
            }
            return;
          }
          const values = Array.isArray(newValue) ? newValue : [newValue];
          this[idKey] = values.map((v) => v.id);
          const relationClassName = classResolver().modelName;
          const store =
            this.store.rootStore.getStoreForModelName(relationClassName);
          invariant(store, `Store for ${relationClassName} not found`);
          values.forEach((v) => store.add(v));
        } else {
          if (Array.isArray(newValue)) {
            throw new Error(
              `Cannot set array value to single relation property ${String(
                propertyKey
              )}`
            );
          }
          this[idKey] = newValue ? newValue.id : undefined;
          if (newValue) {
            const relationClassName = classResolver().modelName;
            const store =
              this.store.rootStore.getStoreForModelName(relationClassName);
            invariant(store, `Store for ${relationClassName} not found`);
            store.add(newValue);
          } else if (options?.required) {
            throw new Error(
              `Cannot set required ${String(propertyKey)} to undefined`
            );
          }
        }
      },
      enumerable: true,
      configurable: true,
    });
  };
}
