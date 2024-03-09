import { taskListItems, strikethrough } from "@joplin/turndown-plugin-gfm";
import TurndownService from "turndown";
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

const escapes: [RegExp, string][] = [
  [/\\/g, "\\\\"],
  [/\*/g, "\\*"],
  [/^-/g, "\\-"],
  [/^\+ /g, "\\+ "],
  [/^(=+)/g, "\\$1"],
  [/^(#{1,6}) /g, "\\$1 "],
  [/`/g, "\\`"],
  [/^~~~/g, "\\~~~"],
  [/\[/g, "\\["],
  [/\]/g, "\\]"],
  [/\(/g, "\\("], // OLN-91
  [/\)/g, "\\)"], // OLN-91
  [/^>/g, "\\>"],
  [/_/g, "\\_"],
  [/^(\d+)\. /g, "$1\\. "],
  [/\$/g, "\\$"],
];

/**
 * Overrides the Markdown escaping, as documented here:
 * https://github.com/mixmark-io/turndown/blob/4499b5c313d30a3189a58fdd74fc4ed4b2428afd/README.md#overriding-turndownserviceprototypeescape
 *
 * @param text The string to escape
 * @returns A string with Markdown syntax escaped
 */
service.escape = function (text) {
  return escapes.reduce(function (accumulator, escape) {
    return accumulator.replace(escape[0], escape[1]);
  }, text);
};

export default service;
