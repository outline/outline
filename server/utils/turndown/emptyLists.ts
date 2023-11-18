import TurndownService from "turndown";

/**
 * A turndown plugin for unwrapping top-level empty list items.
 *
 * @param turndownService The TurndownService instance.
 */
export default function emptyLists(turndownService: TurndownService) {
  turndownService.addRule("empty-lists", {
    filter(node) {
      return (
        node.nodeName === "LI" &&
        node.childNodes.length === 1 &&
        (node.firstChild?.nodeName === "OL" ||
          node.firstChild?.nodeName === "UL")
      );
    },
    replacement(content) {
      return content;
    },
  });
}
