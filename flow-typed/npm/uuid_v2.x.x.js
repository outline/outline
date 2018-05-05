// flow-typed signature: 7af6723fc9db45a9ff15454c1ca56557
// flow-typed version: b43dff3e0e/uuid_v2.x.x/flow_>=v0.32.x

declare module 'uuid' {
  declare function v1(options?: {|
    node?: number[],
    clockseq?: number,
    msecs?: number | Date,
    nsecs?: number,
  |}, buffer?: number[] | Buffer, offset?: number): string;
  declare function v4(options?: {|
    random?: number[],
    rng?: () => number[] | Buffer,
  |}, buffer?: number[] | Buffer, offset?: number): string;
  declare function parse(id: string, buffer?: number[] | Buffer, offset?: number): Buffer;
  declare function unparse(buffer?: number[] | Buffer, offset?: number): string;
}
