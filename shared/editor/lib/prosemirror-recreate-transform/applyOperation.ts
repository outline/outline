import type { Operation } from "@shared/utils/rfc6902";
import { applyPatch } from "@shared/utils/rfc6902";
import { Pointer } from "@shared/utils/rfc6902/pointer";
import { clone, hasOwn } from "@shared/utils/rfc6902/util";
import type { JSONObject, JSONValue } from "./types";

/** Keys that the JSON pointer evaluation skips, see `Pointer.evaluate`. */
const skippedKeys = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Applies a JSON patch operation without changing the given value. Only the
 * containers on the path of the operation are copied, all other values are
 * shared with the original.
 *
 * @param value the value to apply the operation to.
 * @param operation the operation to apply.
 * @returns the patched value.
 */
export function applyOperation(
  value: JSONObject,
  operation: Operation
): JSONObject {
  const tokens = Pointer.fromJSON(operation.path).tokens;

  // Operations with a "from" path change a second location, so copy all.
  if ("from" in operation || tokens.some((token) => skippedKeys.has(token))) {
    const result = clone(value);
    applyPatch(result, [operation]);
    return result;
  }

  const result = { ...value };
  let parent: JSONValue = result;

  // The last token is the key that the operation changes in its parent.
  for (let i = 1; i < tokens.length - 1; i++) {
    const key = tokens[i];
    if (typeof parent !== "object" || !hasOwn(parent, key)) {
      break;
    }

    const container = parent as Record<string, JSONValue>;
    const child = container[key];
    if (child === null || typeof child !== "object") {
      break;
    }

    container[key] = Array.isArray(child) ? [...child] : { ...child };
    parent = container[key];
  }

  applyPatch(result, [operation]);
  return result;
}
