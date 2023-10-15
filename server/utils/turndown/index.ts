import { gfm } from "@joplin/turndown-plugin-gfm";
import TurndownService from "turndown";
import breaks from "./breaks";
import emptyLists from "./emptyLists";
import emptyParagraphs from "./emptyParagraph";
import frames from "./frames";
import images from "./images";
import sanitizeTables from "./sanitizeTables";
import underlines from "./underlines";

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
  .use(emptyParagraphs)
  .use(sanitizeTables)
  .use(underlines)
  .use(frames)
  .use(images)
  .use(breaks)
  .use(emptyLists);

export default service;
