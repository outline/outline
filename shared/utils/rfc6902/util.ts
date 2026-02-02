export const hasOwnProperty = Object.prototype.hasOwnProperty;

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
export function clone<T>(source: T): T {
  if (!isNonPrimitive(source)) {
    // short-circuiting is faster than a single return
    return source;
  }
  // x.constructor == Array is the fastest way to check if x is an Array
  if (source.constructor === Array) {
    // construction via imperative for-loop is faster than source.map(arrayVsObject)
    const length = (source as Array<unknown>).length;
    // setting the Array length during construction is faster than just `[]` or `new Array()`
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
    // hasOwnProperty costs a bit of performance, but it's semantically necessary
    // using a global helper is MUCH faster than calling source.hasOwnProperty(key)
    if (hasOwnProperty.call(source, key)) {
      (objectTarget as Record<string, unknown>)[key] = clone(
        (source as Record<string, unknown>)[key]
      );
    }
  }
  return objectTarget;
}
