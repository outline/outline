import { JSONValue } from "./types";

/**
 * get target value from json-pointer (e.g. /content/0/content)
 * @param  {AnyObject} obj  object to resolve path into
 * @param  {string}    path json-pointer
 * @return {any} target value
 */
export function getFromPath(obj: JSONValue, path: string): JSONValue {
  const pathParts = path.split("/");
  pathParts.shift(); // remove root-entry
  while (pathParts.length) {
    if (typeof obj !== "object") {
      throw new Error();
    }
    const property = pathParts.shift() as keyof JSONValue;
    obj = obj[property];
  }
  return obj;
}
