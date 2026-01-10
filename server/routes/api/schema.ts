import type formidable from "formidable";
import type { Schema } from "prosemirror-model";
import { Node } from "prosemirror-model";
import { z } from "zod";
import type { ProsemirrorData as TProsemirrorData } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { schema } from "@server/editor";

export const BaseSchema = z.object({
  body: z.unknown(),
  query: z.unknown(),
  file: z.custom<formidable.File>().optional(),
});

/**
 * Returns a Zod schema for validating a Prosemirror document.
 *
 * @param allowEmpty - Whether to allow an empty document.
 */
export const ProsemirrorSchema = (options?: {
  allowEmpty?: boolean;
  schema?: Schema;
}) => {
  const s = options?.schema ?? schema;
  return z.custom<TProsemirrorData>((val) => {
    try {
      const node = Node.fromJSON(s, val);
      node.check();
      return options?.allowEmpty ? true : !ProsemirrorHelper.isEmpty(node, s);
    } catch (_e) {
      return false;
    }
  }, "Invalid data");
};
