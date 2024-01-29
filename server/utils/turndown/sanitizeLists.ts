import TurndownService from "turndown";

/**
 * A turndown plugin for removing incompatible nodes from lists.
 *
 * @param turndownService The TurndownService instance.
 */
export default function sanitizeLists(turndownService: TurndownService) {
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

  turndownService.addRule("headingsInLists", {
    filter(node) {
      return (
        ["H1", "H2", "H3", "H4", "H5", "H6"].includes(node.nodeName) &&
        inHtmlContext(node, "LI")
      );
    },
    replacement(content, node, options) {
      if (!content.trim()) {
        return "";
      }
      return options.strongDelimiter + content + options.strongDelimiter;
    },
  });

  turndownService.addRule("strongInHeadings", {
    filter(node) {
      return (
        (node.nodeName === "STRONG" || node.nodeName === "B") &&
        ["H1", "H2", "H3", "H4", "H5", "H6"].some((tag) =>
          inHtmlContext(node, tag)
        )
      );
    },
    replacement(content) {
      return content;
    },
  });
}
