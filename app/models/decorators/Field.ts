import type Model from "../base/Model";
const fields = new Map<string, (string | number | symbol)[]>();
/**
 * Per-model map of property key -> the wire JSON key it is populated from
 * (and, for `@Field`-decorated properties, serialized back to), for
 * properties whose local name has diverged from the server's field name.
 */
const wireKeyAliases = new Map<string, Map<string | number | symbol, string>>();
export const getFieldsForModel = <T extends Model>(target: T) =>
  fields.get(target.constructor.name) ?? [];
/**
 * The wire JSON key a property is aliased to, if any.
 *
 * @param target the model instance.
 * @param propertyKey the property to look up.
 * @returns the wire key, or undefined if the property has no alias.
 */
export const getWireKeyForField = <T extends Model>(
  target: T,
  propertyKey: string | number | symbol
): string | undefined =>
  wireKeyAliases.get(target.constructor.name)?.get(propertyKey);
/**
 * The property a wire JSON key is aliased from, if any.
 *
 * @param target the model instance.
 * @param wireKey the wire key to look up.
 * @returns the property key, or undefined if no property is aliased to it.
 */
export const getFieldForWireKey = <T extends Model>(
  target: T,
  wireKey: string
): string | number | symbol | undefined => {
  const aliases = wireKeyAliases.get(target.constructor.name);
  if (!aliases) {
    return undefined;
  }
  for (const [propertyKey, alias] of aliases) {
    if (alias === wireKey) {
      return propertyKey;
    }
  }
  return undefined;
};
function registerWireKeyAlias(
  target: Model,
  propertyKey: string | symbol,
  wireKey: string
) {
  const className = target.constructor.name;
  const aliases = wireKeyAliases.get(className) ?? new Map();
  aliases.set(propertyKey, wireKey);
  wireKeyAliases.set(className, aliases);
}
/**
 * A decorator that records this key as a serializable field on the model.
 * Properties decorated with @Field will be included in API requests by default.
 *
 * When the server's JSON key for this property differs from the property's
 * own name, call it as a factory with that key instead: `@Field("documentId")
 * noteId: string;`. The model will then be populated from, and serialized
 * back to, the wire key rather than the property's own name.
 *
 * @param target the model instance, when used as a bare decorator, or the
 * wire key to alias to, when used as a decorator factory.
 * @param propertyKey the decorated property, when used as a bare decorator.
 */
function Field(
  wireKey: string
): (target: Model, propertyKey: string | symbol) => void;
function Field(target: Model, propertyKey: string | symbol): void;
function Field(
  targetOrWireKey: Model | string,
  propertyKey?: string | symbol
): ((target: Model, propertyKey: string | symbol) => void) | void {
  if (typeof targetOrWireKey === "string") {
    const wireKey = targetOrWireKey;
    return (target: Model, actualPropertyKey: string | symbol) => {
      const className = target.constructor.name;
      fields.set(className, [
        ...(fields.get(className) ?? []),
        actualPropertyKey,
      ]);
      registerWireKeyAlias(target, actualPropertyKey, wireKey);
    };
  }
  const className = targetOrWireKey.constructor.name;
  fields.set(className, [...(fields.get(className) ?? []), propertyKey!]);
}
export default Field;
/**
 * A decorator that populates this property from a different key in the
 * server's JSON, without adding it to the model's serialized field list.
 *
 * Use this for a property that isn't sent back to the server on save (so it
 * shouldn't be `@Field`-decorated) but whose local name has diverged from
 * the server's field name — it would otherwise never be populated, because
 * hydration matches incoming JSON keys against property names.
 *
 * @param wireKey the key this property is populated from in the server's JSON.
 * @returns the property decorator.
 */
export const WireAlias =
  (wireKey: string) => (target: Model, propertyKey: string | symbol) => {
    registerWireKeyAlias(target, propertyKey, wireKey);
  };
