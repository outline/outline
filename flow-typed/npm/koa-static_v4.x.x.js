// flow-typed signature: d92c6847dfd001423387c701022de893
// flow-typed version: 60fd29d2cf/koa-static_v4.x.x/flow_>=v0.56.x

declare module "koa-static" {
  import type { Stats } from "fs";

  declare type Context = Object;
  declare type Response = Object;

  declare type Middleware = (
    ctx: Context,
    next: () => Promise<void>
  ) => Promise<void> | void;

  declare type Options = {|
    defer?: boolean,
    maxage?: number,
    maxAge?: number,
    immutable?: boolean,
    hidden?: boolean,
    root?: string,
    index?: string | false,
    gzip?: boolean,
    brotli?: boolean,
    format?: boolean,
    setHeaders?: (res: Response, path: string, stats: Stats) => any,
    extensions?: Array<string> | false
  |};

  declare export default function serve(
    root: string,
    opts?: Options
  ): Middleware;
}
