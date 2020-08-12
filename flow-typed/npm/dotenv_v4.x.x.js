// flow-typed signature: c7992a5788422caaab5074361a292df3
// flow-typed version: c6154227d1/dotenv_v4.x.x/flow_>=v0.104.x

declare module "dotenv" {
  declare type DotenvOptions = {
    encoding?: string,
    path?: string,
    ...
  };

  declare function config(options?: DotenvOptions): boolean;

  declare module.exports: {
    config: typeof config,
    load: typeof config,
    parse: (src: string | Buffer) => { [string]: string, ... },
    ...
  }
}
