import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import { richExtensions, withComments } from "@shared/editor/nodes";
import type { ProsemirrorData } from "@shared/types";
import { ProsemirrorHelper as SharedProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { DOMSerializer, Node, Schema } from "prosemirror-model";
import { isUUID } from "validator";

interface HasData {
  data: ProsemirrorData;
}

const extensionManager = new ExtensionManager(withComments(richExtensions));
const schema = new Schema({
  nodes: extensionManager.nodes,
  marks: extensionManager.marks,
});
const serializer = extensionManager.serializer();
const domSerializer = DOMSerializer.fromSchema(schema);

/**
 * Node types that render identically from `toDOM` alone, without a node view,
 * plugin or decoration, so a static render matches the editor.
 */
const staticNodeTypes = new Set([
  "doc",
  "paragraph",
  "text",
  "br",
  "emoji",
  "bullet_list",
  "ordered_list",
  "list_item",
]);

/** Mark types that render identically from `toDOM` alone. */
const staticMarkTypes = new Set([
  "strong",
  "em",
  "underline",
  "strikethrough",
  "highlight",
]);

const isStaticNode = (node: ProsemirrorData) => {
  if (!staticNodeTypes.has(node.type)) {
    return false;
  }
  // Custom emoji are rendered by a component from their uploaded image.
  if (node.type === "emoji" && isUUID(String(node.attrs?.["data-name"]))) {
    return false;
  }
  return (node.marks ?? []).every((mark) => staticMarkTypes.has(mark.type));
};

export class ProsemirrorHelper {
  /**
   * Returns the ProseMirror node for the data when every node and mark in it
   * can be rendered by the schema serializer alone, otherwise undefined.
   *
   * @param data The ProsemirrorData object or ProsemirrorNode
   * @returns The node, or undefined if an editor view is needed to render it
   */
  static toStaticNode(data: ProsemirrorData | Node): Node | undefined {
    const json =
      data instanceof Node ? (data.toJSON() as ProsemirrorData) : data;
    if (!SharedProsemirrorHelper.everyNode(json, isStaticNode)) {
      return undefined;
    }

    try {
      return Node.fromJSON(schema, json);
    } catch (_err) {
      return undefined;
    }
  }

  /**
   * Serializes the content of a node to HTML using the schema alone.
   *
   * @param node The node to serialize
   * @returns The rendered content as an HTML string
   */
  static toHTML(node: Node): string {
    const container = document.createElement("div");
    container.appendChild(domSerializer.serializeFragment(node.content));
    return container.innerHTML;
  }

  /**
   * Returns the markdown representation of the document derived from the ProseMirror data.
   *
   * @returns The markdown representation of the document as a string.
   */
  static toMarkdown = (document: HasData) => {
    const doc = Node.fromJSON(
      schema,
      SharedProsemirrorHelper.attachmentsToAbsoluteUrls(document.data)
    );

    const markdown = serializer.serialize(doc, {
      commonMark: true,
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
      Node.fromJSON(schema, document.data)
    );
    return text;
  };
}
