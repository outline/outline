// @flow
import fs from "fs";
import path from "path";
import diff from "node-htmldiff";
import markdownRules from "rich-markdown-editor/dist/lib/markdown/rules";

// markdown-it instance
const md = markdownRules({});

export default function revisionDiff(before: string, after: string) {
  // The basic idea here is to first render the markdown and then diff the HTML
  // - both sides will have valid HTML so we should have a valid diff as well

  const beforeHtml = md.render(before);
  const afterHtml = md.render(after);

  console.log({ beforeHtml, afterHtml });

  // DIFF!

  const diffHtml = diff(beforeHtml, afterHtml);
  console.log("DIFF==>", diffHtml);

  return diffHtml;
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
