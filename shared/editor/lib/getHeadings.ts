import { EditorView } from "prosemirror-view";
import headingToSlug from "./headingToSlug";

export default function getHeadings(view: EditorView) {
  const headings: { title: string; level: number; id: string }[] = [];
  const previouslySeen = {};

  view.state.doc.forEach((node) => {
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
