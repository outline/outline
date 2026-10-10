export type JSONValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type JSONObject = { [x: string]: JSONValue };

export type ProsemirrorMark = {
  type: string;
  attrs?: JSONObject;
};

export type ProsemirrorData = {
  type: string;
  content?: ProsemirrorData[];
  text?: string;
  attrs?: JSONObject;
  marks?: ProsemirrorMark[];
};

export type ProsemirrorDoc = {
  type: "doc";
  content: ProsemirrorData[];
};

/** Edit modes for document text updates. */
export enum TextEditMode {
  /** Replace existing content with new content (default). */
  Replace = "replace",
  /** Append new content to the end of the document. */
  Append = "append",
  /** Prepend new content to the beginning of the document. */
  Prepend = "prepend",
  /** Patch specific content within the document by finding and replacing text. */
  Patch = "patch",
}
