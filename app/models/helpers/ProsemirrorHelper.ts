import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import { richExtensions, withComments } from "@shared/editor/nodes";
import { ProsemirrorHelper as SharedProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import type Document from "../Document";
import { Schema } from "prosemirror-model";
import { Node } from "prosemirror-model";

export class ProsemirrorHelper {
  /**
   * Returns the markdown representation of the document derived from the ProseMirror data.
   *
   * @returns The markdown representation of the document as a string.
   */
  static toMarkdown = (document: Document) => {
    const extensionManager = new ExtensionManager(withComments(richExtensions));
    const serializer = extensionManager.serializer();
    const schema = new Schema({
      nodes: extensionManager.nodes,
      marks: extensionManager.marks,
    });

    const doc = Node.fromJSON(
      schema,
      SharedProsemirrorHelper.attachmentsToAbsoluteUrls(document.data)
    );

    const markdown = serializer.serialize(doc, {
      softBreak: true,
    });
    return markdown;
  };

  /**
   * Returns the plain text representation of the document derived from the ProseMirror data.
   *
   * @returns The plain text representation of the document as a string.
   */
  static toPlainText = (document: Document) => {
    const extensionManager = new ExtensionManager(withComments(richExtensions));
    const schema = new Schema({
      nodes: extensionManager.nodes,
      marks: extensionManager.marks,
    });
    const text = SharedProsemirrorHelper.toPlainText(
      Node.fromJSON(schema, document.data)
    );
    return text;
  };
}
