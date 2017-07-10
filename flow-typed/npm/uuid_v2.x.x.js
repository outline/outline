// flow-typed signature: fc8302ad15d259d398addf96a9488e10
// flow-typed version: 27f92307d3/uuid_v2.x.x/flow_>=v0.33.x

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
