// flow-typed signature: 2950a094dd6d8e47a8535df1da5d65eb
// flow-typed version: da30fe6876/normalizr_v2.x.x/flow_>=v0.25.x

declare class Normalizr$Schema {
  define(nestedSchema: Object): void;
}
type Normalizr$SchemaOrObject = Normalizr$Schema | Object;

declare module "normalizr" {
  declare class Normalizr {
    normalize(
      obj: Object | Array<Object>,
      schema: Normalizr$SchemaOrObject
    ): Object;
    Schema(key: string, options?: Object): Normalizr$Schema;
    arrayOf(
      schema: Normalizr$SchemaOrObject,
      options?: Object
    ): Normalizr$Schema;
    valuesOf(
      schema: Normalizr$SchemaOrObject,
      options?: Object
    ): Normalizr$Schema;
  }
  declare module.exports: Normalizr;
}
