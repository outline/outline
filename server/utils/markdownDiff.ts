import { findIndex, findLastIndex } from "lodash";
import diff from "node-htmldiff";
import renderToHtml from "@server/editor/renderToHtml";

export default function markdownDiff(
  before: string,
  after: string,
  fullDiff = false,
  buffer = 1
) {
  // The basic idea here is to first render the Markdown to HTML, then diff the
  // HTML - both sides will have valid HTML so we should have a valid diff as well

  const beforeHtml = renderToHtml(before);
  const afterHtml = renderToHtml(after);
  const diffHtml = diff(beforeHtml, afterHtml);

  if (fullDiff) {
    return diffHtml;
  }

  if (before === after) {
    return "";
  }

  // Split diff at paragraphs and find the first and last changed tags
  // so we can chop around paragraphs rather than return the entire document.
  //
  // In an ideal world we'd use an AST here and parse that rather than be doing
  // operations on strings. I hope this can be revisted in the future with an
  // improved diffing library.
  const newParagraph = /(?:^|\n)<p>/;
  let lines = diffHtml.split(newParagraph);

  const firstChangedLineIndex = findIndex(
    lines,
    (value) => value.includes("<ins ") || value.includes("<del ")
  );
  const lastChangedLineIndex = findLastIndex(
    lines,
    (value) => value.includes("</ins>") || value.includes("</del>")
  );

  const start = Math.max(0, firstChangedLineIndex - buffer);
  const end = Math.min(lines.length, lastChangedLineIndex + buffer);
  lines = lines.slice(start, end);

  if (!lines.length) {
    return "";
  }

  return [start > 0 ? "" : undefined, ...lines]
    .filter((x) => x !== undefined)
    .join("\n<p>")
    .trim();
}
