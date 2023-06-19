import TurndownService from "turndown";

/**
 * A turndown plugin for converting a confluence task list to markdown.
 *
 * @param turndownService The TurndownService instance.
 */
export default function confluenceTaskList(turndownService: TurndownService) {
  turndownService.addRule("confluenceTaskList", {
    filter(node) {
      return (
        node.nodeName === "LI" &&
        node.parentElement?.nodeName === "UL" &&
        node.parentElement?.className.includes("inline-task-list")
      );
    },
    replacement(content, node) {
      return "className" in node
        ? (node.className === "checked" ? "- [x]" : "- [ ]") + ` ${content} \n`
        : content;
    },
  });
}
