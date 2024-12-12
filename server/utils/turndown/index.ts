import { taskListItems, strikethrough } from "@joplin/turndown-plugin-gfm";
import TurndownService from "turndown";
import { escape } from "@shared/utils/markdown";
import breaks from "./breaks";
import emptyLists from "./emptyLists";
import emptyParagraph from "./emptyParagraph";
import frames from "./frames";
import images from "./images";
import inlineLink from "./inlineLink";
import sanitizeLists from "./sanitizeLists";
import sanitizeTables from "./sanitizeTables";
import tables from "./tables";
import underlines from "./underlines";
import { inHtmlContext } from "./utils";

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
  blankReplacement: (_, node) =>
    node.nodeName === "P" && !inHtmlContext(node as HTMLElement, "td, th")
      ? "\n\n\\\n"
      : "",
})
  .remove(["script", "style", "title", "head"])
  .use(taskListItems)
  .use(strikethrough)
  .use(tables)
  .use(inlineLink)
  .use(emptyParagraph)
  .use(sanitizeTables)
  .use(sanitizeLists)
  .use(underlines)
  .use(frames)
  .use(images)
  .use(breaks)
  .use(emptyLists);

service.escape = escape;

export default service;
