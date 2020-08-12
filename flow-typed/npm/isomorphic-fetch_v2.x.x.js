// flow-typed signature: 03bcd2195d27d9c7b8ea57265f6673cd
// flow-typed version: c6154227d1/isomorphic-fetch_v2.x.x/flow_>=v0.104.x

declare module "isomorphic-fetch" {
  declare module.exports: (
    input: string | Request | URL,
    init?: RequestOptions
  ) => Promise<Response>;
}
