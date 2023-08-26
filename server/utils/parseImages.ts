import { Node } from "prosemirror-model";
import { parser } from "@server/editor";

type ImageProps = { src: string; alt: string };

/**
 * Parses a string of markdown and returns a list of images.
 *
 * @param text The markdown to parse
 * @returns A unique list of images
 */
export default function parseImages(text: string): ImageProps[] {
  const doc = parser.parse(text);
  const images = new Map<string, ImageProps>();

  if (!doc) {
    return [];
  }

  doc.descendants((node: Node) => {
    if (node.type.name === "image") {
      if (!images.has(node.attrs.src)) {
        images.set(node.attrs.src, {
          src: node.attrs.src,
          alt: node.attrs.alt,
        });
      }

      return false;
    }

    if (!node.content.size) {
      return false;
    }

    return true;
  });

  return Array.from(images.values());
}
