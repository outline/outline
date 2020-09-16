// @flow
import { parser } from "rich-markdown-editor";

export default function parseImages(text: string): string[] {
  const value = parser.parse(text);
  let images = [];

  function findImages(node) {
    // get text nodes
    if (node.type.name === "image") {
      images.push(node.attrs.src);
    }

    if (!node.content.size) {
      return;
    }

    node.content.descendants(findImages);
  }

  findImages(value);
  return images;
}
