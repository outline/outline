import TurndownService from "turndown";

/**
 * A turndown plugin for converting break tags to newlines.
 *
 * @param turndownService The TurndownService instance.
 */
export default function breaks(turndownService: TurndownService) {
  turndownService.addRule("breaks", {
    filter: ["br"],
    replacement() {
      return "\\n";
    },
  });
}
