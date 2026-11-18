import type Model from "../base/Model";

type ModelClass = Function;

// Keyed by the class itself – minified builds mangle class names and two
// classes in separate chunks can end up sharing one.
const fields = new WeakMap<ModelClass, (string | number | symbol)[]>();

/**
 * Returns the keys recorded as serializable fields on a model.
 *
 * @param target the model to inspect.
 * @returns the keys decorated with @Field.
 */
export const getFieldsForModel = <T extends Model>(target: T) =>
  getFieldsForModelClass(target.constructor);

/**
 * Returns the keys recorded as serializable fields on a model class.
 *
 * @param model the model class to inspect.
 * @returns the keys decorated with @Field.
 */
export function getFieldsForModelClass(model: ModelClass) {
  return fields.get(model) ?? [];
}

/**
 * A decorator that records this key as a serializable field on the model.
 * Properties decorated with @Field will be included in API requests by default.
 *
 * @param target the model the property is defined on.
 * @param propertyKey the key to record as a field.
 */
const Field = (target: Model, propertyKey: string | symbol) => {
  const modelClass = target.constructor;
  fields.set(modelClass, [...(fields.get(modelClass) ?? []), propertyKey]);
};

export default Field;
