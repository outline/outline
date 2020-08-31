// flow-typed signature: a36ecc712f81ebaf81889f2dfaff56b6
// flow-typed version: c6154227d1/uuid_v2.x.x/flow_>=v0.104.x

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
