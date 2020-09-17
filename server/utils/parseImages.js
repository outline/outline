// @flow
import { parser } from "rich-markdown-editor";

export default function parseImages(text: string): string[] {
  const value = parser.parse(text);
  const images = [];

  function findImages(node) {
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
