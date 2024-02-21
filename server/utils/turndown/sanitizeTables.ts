import TurndownService from "turndown";
import { inHtmlContext } from "./utils";

/**
 * A turndown plugin for removing incompatible nodes from tables.
 *
 * @param turndownService The TurndownService instance.
 */
export default function sanitizeTables(turndownService: TurndownService) {
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
    replacement(content, node) {
      return content.trim() + (node.nextSibling ? "\\n" : "");
    },
  });
}
