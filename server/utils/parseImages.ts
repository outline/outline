import { parser } from "rich-markdown-editor";

export default function parseImages(text: string): string[] {
  const value = parser.parse(text);
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'images' implicitly has type 'any[]' in s... Remove this comment to see the full error message
  const images = [];

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'node' implicitly has an 'any' type.
  function findImages(node) {
    if (node.type.name === "image") {
      // @ts-expect-error ts-migrate(7005) FIXME: Variable 'images' implicitly has an 'any[]' type.
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
  // @ts-expect-error ts-migrate(7005) FIXME: Variable 'images' implicitly has an 'any[]' type.
  return images;
}
