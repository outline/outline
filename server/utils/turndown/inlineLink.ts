import TurndownService from "turndown";

/**
 * A turndown plugin for converting anchors to inline links without a title.
 *
 * @param turndownService The TurndownService instance.
 */
export default function underlines(turndownService: TurndownService) {
  turndownService.addRule("inlineLink", {
    filter(node, options) {
      return !!(
        options.linkStyle === "inlined" &&
        node.nodeName === "A" &&
        node.getAttribute("href")
      );
    },
    replacement(content, node: HTMLElement) {
      const href = node.getAttribute("href");
      return "[" + content + "](" + href + ")";
    },
  });
}
