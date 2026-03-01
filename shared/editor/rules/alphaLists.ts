import type MarkdownIt from "markdown-it";

/**
 * Markdown-it plugin to enable parsing of alphabetic ordered lists (a., b., c., etc.)
 *
 * By default, markdown-it only recognizes numeric ordered lists (1., 2., 3.).
 * This plugin preprocesses the input to convert alphabetic list markers to numeric
 * while preserving marker information in the token attributes.
 */
export default function markdownItAlphaLists(md: MarkdownIt): void {
  // Preprocess the source to convert alpha markers to numbers
  md.core.ruler.before("normalize", "alpha_lists_preprocess", (state) => {
    const lines = state.src.split("\n");
    const processedLines: string[] = [];
    const lineMarkers: Array<{
      lineIndex: number;
      marker: string;
      listStyle: string;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match alphabetic list markers with at least one space after the period
      const match = line.match(/^(\s*)([a-zA-Z])\.\s+(.*)$/);

      if (match) {
        const indent = match[1];
        const letter = match[2];
        const content = match[3];
        const isLowercase = letter === letter.toLowerCase();
        const num = isLowercase
          ? letter.charCodeAt(0) - 96 // a=1, b=2
          : letter.charCodeAt(0) - 64; // A=1, B=2
        const listStyle = isLowercase ? "lower-alpha" : "upper-alpha";

        lineMarkers.push({
          lineIndex: processedLines.length,
          marker: letter,
          listStyle,
        });
        processedLines.push(`${indent}${num}. ${content}`);
      } else {
        processedLines.push(line);
      }
    }

    // Store marker info for later, including line mapping
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

    // Build a map of line numbers to markers for more reliable matching
    const lineToMarkerMap = new Map<number, typeof markers[0]>();
    for (const marker of markers) {
      lineToMarkerMap.set(marker.lineIndex, marker);
    }

    // Track which markers we've used to handle multiple lists correctly
    const usedMarkers = new Set<number>();

    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];

      // Find ordered_list_open tokens and match them with the first list item
      if (token.type === "ordered_list_open") {
        // Look ahead to find the first list_item_open token
        for (let j = i + 1; j < state.tokens.length; j++) {
          const itemToken = state.tokens[j];

          if (itemToken.type === "list_item_open" && itemToken.map) {
            const itemLine = itemToken.map[0];

            // Find the marker for this line or nearby lines.
            // We check up to 2 lines back to handle cases where markdown-it's
            // line mapping differs slightly from our preprocessing due to blank
            // lines or formatting differences in list item content.
            const MAX_LINE_OFFSET = 2;
            for (let offset = 0; offset <= MAX_LINE_OFFSET; offset++) {
              const checkLine = itemLine - offset;
              const marker = lineToMarkerMap.get(checkLine);

              if (marker && !usedMarkers.has(marker.lineIndex)) {
                // Set the markup to the original letter marker
                token.markup = marker.marker;

                // Add an attribute to indicate this was an alphabetic list
                token.attrSet("data-list-style", marker.listStyle);

                // Mark this marker as used
                usedMarkers.add(marker.lineIndex);
                break;
              }
            }
            break;
          }

          // Stop if we hit another list or go too far
          if (
            itemToken.type === "ordered_list_open" ||
            itemToken.type === "bullet_list_open"
          ) {
            break;
          }
        }
      }
    }

    // Clean up the environment
    delete state.env.alphaListMarkers;
  });
}
