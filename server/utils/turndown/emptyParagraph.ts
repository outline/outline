import TurndownService from "turndown";

/**
 * A turndown plugin for converting paragraphs with only breaks to newlines.
 *
 * @param turndownService The TurndownService instance.
 */
export default function emptyParagraphs(turndownService: TurndownService) {
  turndownService.addRule("emptyParagraphs", {
    filter(node) {
      return (
        node.nodeName === "P" &&
        node.children.length === 1 &&
        node.textContent?.trim() === "" &&
        node.children[0].nodeName === "BR"
      );
    },
    replacement() {
      return "\n\n\\\n";
    },
  });
}
