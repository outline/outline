import { Node } from "prosemirror-model";
import { parser } from "@server/editor";

export default function parseImages(text: string): string[] {
  const value = parser.parse(text);
  const images: string[] = [];

  function findImages(node: Node) {
    if (node.type.name === "image") {
      if (!images.includes(node.attrs.src)) {
        images.push(node.attrs.src);
      }

      return;
    }

    if (!node.content.size) {
      return;
    }

    node.content.descendants(findImages);
  }

  findImages(value);
  return images;
}
