// flow-typed signature: c10f305aa12406310715d4b7862531d1
// flow-typed version: 748523bcf1/randomstring_v1.x.x/flow_>=v0.62.x

declare module "randomstring" {
  declare type GenerateOptions = {
      length?: number;
      readable?: boolean;
      charset?: string;
      capitalization?: string;
  };
  declare module.exports: {
      generate: (options?: GenerateOptions | number) => string
  }
}
