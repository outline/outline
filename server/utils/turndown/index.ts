import { gfm } from "@joplin/turndown-plugin-gfm";
import TurndownService from "turndown";
import breaks from "./breaks";
import confluenceCodeBlock from "./confluence-code-block";
import confluenceTaskList from "./confluence-task-list";
import emptyLists from "./empty-lists";
import images from "./images";

/**
 * Turndown converts HTML to Markdown and is used in the importer code.
 *
 * For options, see: https://github.com/domchristie/turndown#options
 */
const service = new TurndownService({
  hr: "---",
  bulletListMarker: "-",
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  blankReplacement: (content, node) => {
    if (node.nodeName === "P") {
      return "\n\n\\\n";
    }
    return "";
  },
})
  .remove(["script", "style", "title", "head"])
  .use(gfm)
  .use(confluenceTaskList)
  .use(confluenceCodeBlock)
  .use(images)
  .use(breaks)
  .use(emptyLists);

export default service;
