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
        node.parentNode?.nodeName === "UL" &&
        // @ts-expect-error className exists
        node.parentNode?.className.includes("inline-task-list")
      );
    },
    replacement(content, node) {
      return (
        // @ts-expect-error className exists
        (node.className === "checked" ? "- [x]" : "- [ ]") + ` ${content} \n`
      );
    },
  });
}
