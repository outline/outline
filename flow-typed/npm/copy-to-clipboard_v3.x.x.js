// flow-typed signature: 350413ab85bd03f3d1450c0ae307d106
// flow-typed version: c6154227d1/copy-to-clipboard_v3.x.x/flow_>=v0.104.x

declare module 'copy-to-clipboard' {
  declare export type Options = {|
    debug?: boolean,
    message?: string,
  |};

  declare module.exports: (text: string, options?: Options) => boolean;
}
