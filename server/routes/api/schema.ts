import formidable from "formidable";
import { Node } from "prosemirror-model";
import { z } from "zod";
import { ProsemirrorData as TProsemirrorData } from "@shared/types";
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
export const ProsemirrorSchema = (options?: { allowEmpty: boolean }) =>
  z.custom<TProsemirrorData>((val) => {
    try {
      const node = Node.fromJSON(schema, val);
      node.check();
      return options?.allowEmpty
        ? true
        : !ProsemirrorHelper.isEmpty(node, schema);
    } catch (_e) {
      return false;
    }
  }, "Invalid data");
