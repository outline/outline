// flow-typed signature: 33bbf70064fc58400833489a101165a7
// flow-typed version: 45acb9a3f7/isomorphic-fetch_v2.x.x/flow_>=v0.25.x

declare module "isomorphic-fetch" {
  declare module.exports: (
    input: string | Request | URL,
    init?: RequestOptions
  ) => Promise<Response>;
}
