import type MarkdownIt from "markdown-it";

/**
 * Markdown-it plugin to enable parsing of alphabetic ordered lists (a., b., c., etc.)
 *
 * By default, markdown-it only recognizes numeric ordered lists (1., 2., 3.).
 * This plugin preprocesses the input to convert alphabetic list markers to numeric
 * while preserving marker information in the token attributes.
 */
export default function markdownItAlphaLists(md: MarkdownIt): void {
  // Store marker information during preprocessing
  const markerInfo = new WeakMap<any, { markup: string; listStyle: string }>();

  // Preprocess the source to convert alpha markers to numbers
  md.core.ruler.before("normalize", "alpha_lists_preprocess", (state) => {
    const lines = state.src.split("\n");
    const processedLines: string[] = [];
    const lineMarkers: Array<{
      line: number;
      marker: string;
      listStyle: string;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)([a-zA-Z])\.\s(.*)$/);

      if (match) {
        const indent = match[1];
        const letter = match[2];
        const content = match[3];
        const isLowercase = letter === letter.toLowerCase();
        const num = isLowercase
          ? letter.charCodeAt(0) - 96 // a=1, b=2
          : letter.charCodeAt(0) - 64; // A=1, B=2
        const listStyle = isLowercase ? "lower-alpha" : "upper-alpha";

        lineMarkers.push({ line: processedLines.length, marker: letter, listStyle });
        processedLines.push(`${indent}${num}. ${content}`);
      } else {
        processedLines.push(line);
      }
    }

    // Store marker info for later
    if (lineMarkers.length > 0) {
      state.env.alphaListMarkers = lineMarkers;
    }

    state.src = processedLines.join("\n");
  });

  // Post-process tokens to add the listStyle attribute
  md.core.ruler.after("block", "alpha_lists_postprocess", (state) => {
    if (!state.env.alphaListMarkers || state.env.alphaListMarkers.length === 0) {
      return;
    }

    const markers = state.env.alphaListMarkers;
    let markerIndex = 0;

    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];

      // Find ordered_list_open tokens
      if (token.type === "ordered_list_open" && markerIndex < markers.length) {
        const marker = markers[markerIndex];

        // Set the markup to the original letter marker
        token.markup = marker.marker;

        // Add an attribute to indicate this was an alphabetic list
        token.attrSet("data-list-style", marker.listStyle);

        markerIndex++;
      }
    }

    // Clean up the environment
    delete state.env.alphaListMarkers;
  });
}
