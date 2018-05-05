// flow-typed signature: cf11c66b2c3d752c24fdf3eae1b44e1c
// flow-typed version: 21e1db763b/dotenv_v4.x.x/flow_>=v0.34.x

declare module "dotenv" {
  declare type DotenvOptions = {
    encoding?: string,
    path?: string
  };

  declare function config(options?: DotenvOptions): boolean;

  declare module.exports: {
    config: typeof config,
    load: typeof config,
    parse: (src: string | Buffer) => { [string]: string }
  }
}
