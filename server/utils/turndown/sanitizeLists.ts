import TurndownService from "turndown";
import { inHtmlContext } from "./utils";

/**
 * A turndown plugin for removing incompatible nodes from lists.
 *
 * @param turndownService The TurndownService instance.
 */
export default function sanitizeLists(turndownService: TurndownService) {
  // Fork of default functionality to only use a single space between marker and content
  // See: https://github.com/mixmark-io/turndown/blob/cc73387fb707e5fb5e1083e94078d08f38f3abc8/src/commonmark-rules.js#L61
  turndownService.addRule("listItem", {
    filter: "li",

    replacement(content: string, node: HTMLElement, options: any) {
      // Calculate the nesting level of this list item
      let nestingLevel = 0;
      let parent = node.parentNode;
      
      // Count how many list containers (OL/UL) we're nested within
      while (parent && (parent.nodeName === "OL" || parent.nodeName === "UL")) {
        nestingLevel++;
        // Move up two levels: from OL/UL to LI to the next container
        const grandParent = parent.parentNode;
        if (grandParent && grandParent.parentNode) {
          parent = grandParent.parentNode;
        } else {
          break;
        }
      }

      // Apply proper indentation based on nesting level
      const baseIndent = "  ".repeat(nestingLevel);
      
      // Process the content with proper indentation
      content = content
        .replace(/^\n+/, "") // remove leading newlines
        .replace(/\n+$/, "\n") // replace trailing newlines with just a single one
        .replace(/\n/gm, `\n${baseIndent}`); // apply proper indentation

      // Determine the prefix for this list item
      let prefix = options.bulletListMarker + " ";
      const parentList = node.parentNode;
      if (parentList && parentList.nodeName === "OL") {
        const start = (parentList as HTMLElement).getAttribute("start");
        const index = Array.prototype.indexOf.call(parentList.children, node);
        prefix = (start ? Number(start) + index : index + 1) + ". ";
      }
      
      const output =
        prefix +
        content +
        (node.nextSibling && !/\n$/.test(content) ? "\n" : "");
      return output;
    },
  });

  turndownService.addRule("headingsInLists", {
    filter(node: HTMLElement) {
      return (
        ["H1", "H2", "H3", "H4", "H5", "H6"].includes(node.nodeName) &&
        inHtmlContext(node, "LI")
      );
    },
    replacement(content: string, node: HTMLElement, options: any) {
      if (!content.trim()) {
        return "";
      }
      return options.strongDelimiter + content + options.strongDelimiter;
    },
  });

  turndownService.addRule("strongInHeadings", {
    filter(node: HTMLElement) {
      return (
        (node.nodeName === "STRONG" || node.nodeName === "B") &&
        ["H1", "H2", "H3", "H4", "H5", "H6"].some((tag) =>
          inHtmlContext(node, tag)
        )
      );
    },
    replacement(content: string) {
      return content;
    },
  });
}
