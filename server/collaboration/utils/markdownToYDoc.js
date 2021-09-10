// @flow
import { Node, Fragment } from "prosemirror-model";
import { parser, schema } from "rich-markdown-editor";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import embeds from "../../../shared/embeds";

export default function markdownToYDoc(
  markdown: string,
  fieldName?: string = "default"
): Y.Doc {
  let node = parser.parse(markdown);

  // in rich-markdown-editor embeds were created at runtime by converting links
  // into embeds where they match. Because we're converting to a CRDT structure
  // on the server we need to mimic this behavior.
  function urlsToEmbeds(node: Node): Node {
    if (node.type.name === "paragraph") {
      for (const textNode of node.content.content) {
        for (const embed of embeds) {
          if (textNode.text && embed.matcher(textNode.text)) {
            return schema.nodes.embed.createAndFill({
              href: textNode.text,
            });
          }
        }
      }
    }

    if (node.content) {
      const contentAsArray =
        node.content instanceof Fragment ? node.content.content : node.content;
      node.content = Fragment.fromArray(contentAsArray.map(urlsToEmbeds));
    }

    return node;
  }

  node = urlsToEmbeds(node);

  return prosemirrorToYDoc(node, fieldName);
}
