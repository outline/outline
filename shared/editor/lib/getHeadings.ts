import { Node } from "prosemirror-model";
import headingToSlug from "./headingToSlug";

export type Heading = {
  title: string;
  level: number;
  id: string;
};

/**
 * Iterates through the document to find all of the headings and their level.
 *
 * @param doc Prosemirror document node
 * @returns Array<Heading>
 */
export default function getHeadings(doc: Node) {
  const headings: Heading[] = [];
  const previouslySeen = {};

  doc.forEach((node) => {
    if (node.type.name === "heading") {
      // calculate the optimal id
      const id = headingToSlug(node);
      let name = id;

      // check if we've already used it, and if so how many times?
      // Make the new id based on that number ensuring that we have
      // unique ID's even when headings are identical
      if (previouslySeen[id] > 0) {
        name = headingToSlug(node, previouslySeen[id]);
      }

      // record that we've seen this id for the next loop
      previouslySeen[id] =
        previouslySeen[id] !== undefined ? previouslySeen[id] + 1 : 1;

      headings.push({
        title: node.textContent,
        level: node.attrs.level,
        id: name,
      });
    }
  });
  return headings;
}
