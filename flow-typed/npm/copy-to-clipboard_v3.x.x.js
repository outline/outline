// flow-typed signature: 2d67b88033ed19841b9ad74ef2830c56
// flow-typed version: 1ff8a2ca93/copy-to-clipboard_v3.x.x/flow_>=v0.25.x

type Options = {
  debug?: boolean,
  message?: string
};

declare module 'copy-to-clipboard' {
  declare module.exports: (text: string, options?: Options) => boolean;
}
