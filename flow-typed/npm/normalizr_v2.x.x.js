// flow-typed signature: 8b4e81417cdc2bee0f08e1e62d60809e
// flow-typed version: bba36190a2/normalizr_v2.x.x/flow_>=v0.23.x

declare class Normalizr$Schema {
  define(nestedSchema: Object): void;
}
type Normalizr$SchemaOrObject = Normalizr$Schema | Object;

declare module 'normalizr' {
  declare class Normalizr {
    normalize(obj: Object | Array<Object>, schema: Normalizr$SchemaOrObject): Object;
    Schema(key: string, options?: Object): Normalizr$Schema;
    arrayOf(schema: Normalizr$SchemaOrObject, options?: Object): Normalizr$Schema;
    valuesOf(schema: Normalizr$SchemaOrObject, options?: Object): Normalizr$Schema;
  }
  declare var exports: Normalizr;
}
