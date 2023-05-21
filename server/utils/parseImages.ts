import { Node } from "prosemirror-model";
import { parser } from "@server/editor";

export default function parseImages(text: string): string[] {
  const doc = parser.parse(text);
  const images: string[] = [];
  if (!doc) {
    return images;
  }

  doc.descendants((node: Node) => {
    if (node.type.name === "image") {
      if (!images.includes(node.attrs.src)) {
        images.push(node.attrs.src);
      }

      return false;
    }

    if (!node.content.size) {
      return false;
    }

    return true;
  });

  return images;
}
