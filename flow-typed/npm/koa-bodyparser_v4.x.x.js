// flow-typed signature: a58f72097622ee04c396fbb8bb02db81
// flow-typed version: c6154227d1/koa-bodyparser_v4.x.x/flow_>=v0.104.x

declare module "koa-bodyparser" {
  declare type Context = Object;

  declare type Middleware = (
    ctx: Context,
    next: () => Promise<void>
  ) => Promise<void> | void;

  declare type Options = {|
    enableTypes?: Array<string>,
    encode?: string,
    formLimit?: string,
    jsonLimit?: string,
    strict?: boolean,
    detectJSON?: (ctx: Context) => boolean,
    extendTypes?: {
      json?: Array<string>,
      form?: Array<string>,
      text?: Array<string>,
      ...
    },
    onerror?: (err: Error, ctx: Context) => void
  |};

  declare module.exports: (opts?: Options) => Middleware;
}
