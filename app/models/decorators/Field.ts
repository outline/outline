import type Model from "../base/Model";

const fields = new Map<string, string[]>();

export const getFieldsForModel = (target: Model) =>
  fields.get(target.constructor.name) ?? [];

/**
 * A decorator that records this key as a serializable field on the model.
 * Properties decorated with @Field will be included in API requests by default.
 *
 * @param target
 * @param propertyKey
 */
const Field = <T>(target: any, propertyKey: keyof T) => {
  const className = target.constructor.name;
  fields.set(className, [
    ...(fields.get(className) || []),
    propertyKey as string,
  ]);
};

export default Field;
