// flow-typed signature: 89e31dc3d71df377b34d408f5725e57a
// flow-typed version: 60fd29d2cf/koa-bodyparser_v4.x.x/flow_>=v0.56.x

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
      text?: Array<string>
    },
    onerror?: (err: Error, ctx: Context) => void
  |};

  declare export default function bodyParser(opts?: Options): Middleware;
}
