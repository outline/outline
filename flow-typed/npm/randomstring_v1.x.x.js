// flow-typed signature: 79b8bf1c61560e00bba06b86ef79871b
// flow-typed version: c6154227d1/randomstring_v1.x.x/flow_>=v0.104.x

declare module "randomstring" {
  declare type GenerateOptions = {
      length?: number,
      readable?: boolean,
      charset?: string,
      capitalization?: string,
      ...
  };
  declare module.exports: { generate: (options?: GenerateOptions | number) => string, ... }
}
