export const hasOwn = (obj: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

export function objectType(object: unknown) {
  if (object === undefined) {
    return "undefined";
  }
  if (object === null) {
    return "null";
  }
  if (Array.isArray(object)) {
    return "array";
  }
  return typeof object;
}

function isNonPrimitive(value: unknown): value is object {
  // loose-equality checking for null is faster than strict checking for each of null/undefined/true/false
  // checking null first, then calling typeof, is faster than vice-versa
  return value !== null && typeof value === "object";
}

/**
 * Recursively copy a value.
 *
 * @param source - should be a JavaScript primitive, Array, Date, or (plain old) Object.
 * @returns copy of source where every Array and Object have been recursively
 *          reconstructed from their constituent elements.
 */
/**
 * Compares two JSON values for deep equality. This is faster than a generic
 * deep equality check as it only handles the types that JSON can hold. Objects
 * with a null prototype, such as ProseMirror attrs, are supported.
 *
 * @param a the first value.
 * @param b the second value.
 * @returns true if the values are deeply equal.
 */
export function isJSONEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (!isNonPrimitive(a) || !isNonPrimitive(b)) {
    // NaN is equal to itself, as with isEqual.
    return a !== a && b !== b;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!isJSONEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) {
    return false;
  }
  for (const key of keys) {
    if (
      !hasOwn(b, key) ||
      !isJSONEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }
  return true;
}

export function clone<T>(source: T): T {
  if (!isNonPrimitive(source)) {
    // short-circuiting is faster than a single return
    return source;
  }
  // x.constructor == Array is the fastest way to check if x is an Array
  if (source.constructor === Array) {
    // construction via imperative for-loop is faster than source.map(arrayVsObject)
    const length = (source as Array<unknown>).length;
    // measurably faster here than `[]`, `.length =` or `Array.from({ length })`
    // oxlint-disable-next-line unicorn/no-new-array
    const arrayTarget = new Array(length) as T;
    for (let i = 0; i < length; i++) {
      (arrayTarget as Array<unknown>)[i] = clone((source as Array<unknown>)[i]);
    }
    return arrayTarget;
  }
  // Date
  if (source.constructor === Date) {
    const dateTarget = new Date(+(source as Date)) as T;
    return dateTarget;
  }
  // Object
  const objectTarget = {} as T;
  // declaring the variable (with const) inside the loop is faster
  for (const key in source) {
    // hasOwn costs a bit of performance, but it's semantically necessary
    if (hasOwn(source, key)) {
      (objectTarget as Record<string, unknown>)[key] = clone(
        (source as Record<string, unknown>)[key]
      );
    }
  }
  return objectTarget;
}
