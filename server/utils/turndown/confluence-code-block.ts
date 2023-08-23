import repeat from "lodash/repeat";
import TurndownService from "turndown";

const highlightRegExp = /brush: ([a-z0-9]+);/;

/**
 * A turndown plugin for converting a confluence code block to markdown.
 *
 * @param turndownService The TurndownService instance.
 */
export default function confluenceCodeBlock(turndownService: TurndownService) {
  turndownService.addRule("fencedConfluenceHighlightedCodeBlock", {
    filter(node) {
      const firstChild = node.firstChild;
      return (
        node.nodeName === "DIV" &&
        firstChild?.nodeName === "PRE" &&
        // @ts-expect-error className exists
        firstChild.className === "syntaxhighlighter-pre"
      );
    },
    replacement(content, node) {
      const dataSyntaxhighlighterParams =
        // @ts-expect-error getAttribute exists
        node.firstChild?.getAttribute("data-syntaxhighlighter-params") ?? "";
      const language = (dataSyntaxhighlighterParams.match(highlightRegExp) || [
        null,
        "",
      ])[1];
      const code = node.firstChild?.textContent ?? "";

      const fenceChar = "`";
      let fenceSize = 3;
      const fenceInCodeRegex = new RegExp("^" + fenceChar + "{3,}", "gm");

      let match;
      while ((match = fenceInCodeRegex.exec(code))) {
        if (match[0].length >= fenceSize) {
          fenceSize = match[0].length + 1;
        }
      }

      const fence = repeat(fenceChar, fenceSize);

      return (
        "\n\n" +
        fence +
        language +
        "\n" +
        code.replace(/\n$/, "") +
        "\n" +
        fence +
        "\n\n"
      );
    },
  });
}
