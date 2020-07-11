// @flow
import * as React from "react";
import ReactDOMServer from "react-dom/server";
import ReactMarkdown from "react-markdown";
import HtmlDiff from "htmldiff-js";

export function diff(previous: string, current: string) {
  const previousHtml = ReactDOMServer.renderToStaticMarkup(
    <ReactMarkdown source={previous} />
  );
  const currentHtml = ReactDOMServer.renderToStaticMarkup(
    <ReactMarkdown source={current} />
  );
  return HtmlDiff.execute(previousHtml, currentHtml);
}

export function compactedDiff(previous: string, current: string) {
  const html = diff(previous, current);

  // split diff into lines
  const lines = html
    .replace(/ class="(?:[a-z]+)"/g, "")
    .split(/(<(?:[a-z\d]+)>)/);

  const firstInsert = lines.indexOf("<ins>");
  const firstDelete = lines.indexOf("<del>");

  let lastInsert = 0,
    lastDelete = 0;

  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index] === "<ins>") {
      lastInsert = index;
      break;
    }
  }

  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index] === "<del>") {
      lastDelete = index;
      break;
    }
  }

  const firstChange =
    (firstInsert < firstDelete || firstDelete === -1) && firstInsert !== -1
      ? firstInsert
      : firstDelete;
  const lastChange = lastInsert > lastDelete ? lastInsert : lastDelete;

  if (firstInsert === -1 && firstDelete === -1) {
    return "";
  }

  return lines
    .slice(Math.max(0, firstChange - 2), Math.min(lastChange + 2, lines.length))
    .join("");
}
