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

    replacement(content, node, options) {
      const indent = " ";
      content = content
        .replace(/^\n+/, "") // remove leading newlines
        .replace(/\n+$/, "\n") // replace trailing newlines with just a single one
        .replace(/\n/gm, "\n" + indent);

      let prefix = options.bulletListMarker + indent;
      const parent = node.parentNode;
      if (parent && parent.nodeName === "OL") {
        const start = (parent as HTMLElement).getAttribute("start");
        const index = Array.prototype.indexOf.call(parent.children, node);
        prefix = (start ? Number(start) + index : index + 1) + ".  ";
      }
      return (
        prefix +
        content +
        (node.nextSibling && !/\n$/.test(content) ? "\n" : "")
      );
    },
  });

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
