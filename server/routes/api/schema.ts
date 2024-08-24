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

export const ProsemirrorSchema = z.custom<TProsemirrorData>((val) => {
  try {
    const node = Node.fromJSON(schema, val);
    node.check();
    return !ProsemirrorHelper.isEmpty(node, schema);
  } catch (_e) {
    return false;
  }
}, "not valid data");
