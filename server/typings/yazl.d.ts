import "yazl";

declare module "yazl" {
  interface Options {
    /**
     * Upstream types only declare `fileComment` for entries added from a file
     * or stream, and only as a string. yazl reads it for every entry type —
     * `addBuffer` included — and accepts a Buffer as well.
     */
    fileComment: string | Buffer;
  }
}
