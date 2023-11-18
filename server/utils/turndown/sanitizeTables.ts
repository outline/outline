import TurndownService from "turndown";

/**
 * A turndown plugin for removing incompatible nodes from tables.
 *
 * @param turndownService The TurndownService instance.
 */
export default function sanitizeTables(turndownService: TurndownService) {
  function inHtmlContext(node: HTMLElement, selector: string) {
    let currentNode = node;
    // start at the closest element
    while (currentNode !== null && currentNode.nodeType !== 1) {
      currentNode = (currentNode.parentElement ||
        currentNode.parentNode) as HTMLElement;
    }
    return (
      currentNode !== null &&
      currentNode.nodeType === 1 &&
      currentNode.closest(selector) !== null
    );
  }

  turndownService.addRule("headingsInTables", {
    filter(node) {
      return (
        ["H1", "H2", "H3", "H4", "H5", "H6"].includes(node.nodeName) &&
        inHtmlContext(node, "table")
      );
    },
    replacement(content) {
      return `**${content.trim()}**`;
    },
  });

  turndownService.addRule("paragraphsInCells", {
    filter(node) {
      return node.nodeName === "P" && inHtmlContext(node, "table");
    },
    replacement(content) {
      return content.trim();
    },
  });
}
