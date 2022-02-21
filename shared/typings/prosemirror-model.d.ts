import "prosemirror-model";

declare module "prosemirror-model" {
  interface Slice {
    // this method is missing in the DefinitelyTyped type definition, so we
    // must patch it here.
    // https://github.com/ProseMirror/prosemirror-model/blob/bd13a2329fda39f1c4d09abd8f0db2032bdc8014/src/replace.js#L51
    removeBetween(from: number, to: number): Slice;
  }
}
