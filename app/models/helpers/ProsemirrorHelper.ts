import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import { richExtensions, withComments } from "@shared/editor/nodes";
import type { ProsemirrorData } from "@shared/types";
import { ProsemirrorHelper as SharedProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { Schema } from "prosemirror-model";
import { Node } from "prosemirror-model";

interface HasData {
  data: ProsemirrorData;
}

// Cache these expensive-to-create objects at module level since they never change.
const extensionManager = new ExtensionManager(withComments(richExtensions));
const cachedSchema = new Schema({
  nodes: extensionManager.nodes,
  marks: extensionManager.marks,
});
const cachedSerializer = extensionManager.serializer();

export class ProsemirrorHelper {
  /**
   * Returns the markdown representation of the document derived from the ProseMirror data.
   *
   * @returns The markdown representation of the document as a string.
   */
  static toMarkdown = (document: HasData) => {
    const doc = Node.fromJSON(
      cachedSchema,
      SharedProsemirrorHelper.attachmentsToAbsoluteUrls(document.data)
    );

    const markdown = cachedSerializer.serialize(doc, {
      softBreak: true,
    });
    return markdown;
  };

  /**
   * Returns the plain text representation of the document derived from the ProseMirror data.
   *
   * @returns The plain text representation of the document as a string.
   */
  static toPlainText = (document: HasData) => {
    const text = SharedProsemirrorHelper.toPlainText(
      Node.fromJSON(cachedSchema, document.data)
    );
    return text;
  };
}
