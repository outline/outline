// @flow
import fs from "fs";
import path from "path";
import { findLastIndex } from "lodash";
import diff from "node-htmldiff";
import { renderToHtml } from "rich-markdown-editor";

export default function revisionDiff(
  before: string,
  after: string,
  fullDiff: boolean = false,
  buffer: number = 1
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

  // split diff into individual lines and find the first and last changed tags
  // so we can chop around those lines rather than return the entire document.
  let lines = diffHtml.split("\n");

  const firstChangedLineIndex = findLastIndex(
    lines,
    (value) => value.includes("<ins>") || value.includes("<del>")
  );
  const lastChangedLineIndex = findLastIndex(
    lines,
    (value) => value.includes("</ins>") || value.includes("</del>")
  );

  return lines
    .slice(
      Math.max(0, firstChangedLineIndex - buffer),
      Math.min(lines.length, lastChangedLineIndex + buffer)
    )
    .join("\n");
}

export async function revisionDiffExample() {
  let before = await fs.promises.readFile(
    path.resolve(__dirname, "..", "test", "fixtures", "complex.md"),
    "utf8"
  );

  let after = await fs.promises.readFile(
    path.resolve(__dirname, "..", "test", "fixtures", "complexModified.md"),
    "utf8"
  );

  return revisionDiff(before, after);
}
