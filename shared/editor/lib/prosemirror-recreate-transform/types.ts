export interface JSONObject {
  [p: string]: JSONValue;
}

export type JSONValue =
  | string
  | number
  | boolean
  | JSONObject
  | Array<JSONValue>;
