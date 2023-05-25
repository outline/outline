import { prosemirrorToYDoc } from "@getoutline/y-prosemirror";
import { Node, Fragment } from "prosemirror-model";
import * as Y from "yjs";
import embeds from "@shared/editor/embeds";
import { parser, schema } from "@server/editor";

export default function markdownToYDoc(
  markdown: string,
  fieldName = "default"
): Y.Doc {
  let node = parser.parse(markdown);

  // in the editor embeds were created at runtime by converting links
  // into embeds where they match. Because we're converting to a CRDT structure
  // on the server we need to mimic this behavior.
  function urlsToEmbeds(node: Node): Node | null {
    if (node.type.name === "paragraph") {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'content' does not exist on type 'Fragmen... Remove this comment to see the full error message
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
        // @ts-expect-error content
        node.content instanceof Fragment ? node.content.content : node.content;
      // @ts-expect-error content
      node.content = Fragment.fromArray(contentAsArray.map(urlsToEmbeds));
    }

    return node;
  }

  if (node) {
    node = urlsToEmbeds(node);
  }

  // @ts-expect-error null node
  return prosemirrorToYDoc(node, fieldName);
}
