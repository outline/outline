import TurndownService from "turndown";

/**
 * A turndown plugin for converting u tags to underlines.
 *
 * @param turndownService The TurndownService instance.
 */
export default function underlines(turndownService: TurndownService) {
  turndownService.addRule("underlines", {
    filter: ["u"],
    replacement(content) {
      return `__${content.trim()}__`;
    },
  });
}
