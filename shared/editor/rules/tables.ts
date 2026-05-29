import type MarkdownIt from "markdown-it";

const BREAK_REGEX = /(?<=^|[^\\])\\n/;
const BR_TAG_REGEX = /<br\s*\/?>/gi;
// Matches checkbox syntax with optional list prefix: "- [x] Task" or "[x] Task"
// Stops at <br> or newline to handle multiple checkboxes in a cell
const CHECKBOX_REGEX = /^(?:-\s*)?\[(X|\s|_|-)\]\s([^<\n]*)?/i;

// A GFM table delimiter row consists only of pipes, dashes, colons and spaces,
// contains at least one dash and one pipe, e.g. "| --- | :--: |".
const DELIMITER_ROW_REGEX = /^[\s|:-]*-[\s|:-]*$/;

/**
 * Escape unescaped pipe characters within a single line so that they survive
 * markdown-it's GFM table cell splitting. Pipes already preceded by a backslash
 * are left untouched to avoid double escaping.
 *
 * @param str the string to escape pipes within.
 * @returns the string with unescaped pipes backslash escaped.
 */
function escapePipes(str: string): string {
  return str.replace(/(?<!\\)\|/g, "\\|");
}

/**
 * Find the index of a closing inline code fence — a run of backticks of exactly
 * `length` — starting the search at `from`.
 *
 * @param line the line to search within.
 * @param from the index to begin searching from.
 * @param length the exact backtick run length to match.
 * @returns the index of the closing fence, or -1 if none is found.
 */
function findClosingFence(line: string, from: number, length: number): number {
  let i = from;
  while (i < line.length) {
    if (line[i] === "`") {
      let j = i;
      while (j < line.length && line[j] === "`") {
        j++;
      }
      if (j - i === length) {
        return i;
      }
      i = j;
    } else {
      i++;
    }
  }
  return -1;
}

/**
 * Find the index of a valid closing inline math delimiter ("$") for an opening
 * delimiter at `openIdx`, mirroring the open/close validity checks of the inline
 * math rule so that currency-like text ("$5 | $10") is not treated as math.
 *
 * @param line the line to search within.
 * @param openIdx the index of the opening "$" delimiter.
 * @returns the index of the closing delimiter, or -1 if there is none.
 */
function findClosingMath(line: string, openIdx: number): number {
  const next = line[openIdx + 1];
  // Opening delimiter cannot be followed by whitespace, and must have content.
  if (next === undefined || next === " " || next === "\t") {
    return -1;
  }

  for (let i = openIdx + 2; i < line.length; i++) {
    if (line[i] !== "$") {
      continue;
    }

    // Count preceding backslashes — an odd count means the "$" is escaped.
    let backslashes = 0;
    for (let k = i - 1; k >= 0 && line[k] === "\\"; k--) {
      backslashes++;
    }
    if (backslashes % 2 !== 0) {
      continue;
    }

    // Closing delimiter cannot be preceded by whitespace or followed by a digit.
    const prev = line[i - 1];
    const after = line[i + 1];
    const prevIsSpace = prev === " " || prev === "\t";
    const afterIsDigit = after !== undefined && after >= "0" && after <= "9";
    if (!prevIsSpace && !afterIsDigit) {
      return i;
    }
  }

  return -1;
}

/**
 * Escape pipe characters that appear inside inline code spans (`` `...` ``) and
 * inline math (`$...$`) within a single table row. The surrounding cell
 * delimiters are left untouched so the row still splits into the correct cells.
 *
 * @param line the table row to process.
 * @returns the row with span-internal pipes escaped.
 */
function escapeSpanPipesInRow(line: string): string {
  let result = "";
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    // Preserve existing backslash escapes verbatim.
    if (ch === "\\") {
      result += line.slice(i, i + 2);
      i += 2;
      continue;
    }

    // Inline code span, delimited by an equal length run of backticks.
    if (ch === "`") {
      let runEnd = i;
      while (runEnd < line.length && line[runEnd] === "`") {
        runEnd++;
      }
      const fence = line.slice(i, runEnd);
      const closeIdx = findClosingFence(line, runEnd, fence.length);
      if (closeIdx === -1) {
        result += fence;
        i = runEnd;
        continue;
      }
      result += fence + escapePipes(line.slice(runEnd, closeIdx)) + fence;
      i = closeIdx + fence.length;
      continue;
    }

    // Inline math, delimited by single dollar signs.
    if (ch === "$") {
      const closeIdx = findClosingMath(line, i);
      if (closeIdx === -1) {
        result += ch;
        i++;
        continue;
      }
      result += "$" + escapePipes(line.slice(i + 1, closeIdx)) + "$";
      i = closeIdx + 1;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Escape pipe characters inside inline code spans and math within GFM tables.
 *
 * markdown-it's table block rule splits cells on the pipe character and is
 * unaware of inline code spans and math, so an unescaped pipe inside `` `...` ``
 * or `$...$` incorrectly fragments — or even truncates — the cell. Escaping
 * those pipes before block tokenization lets the table split into the right
 * cells; the backslash is stripped again when each cell's content is re-parsed
 * inline, so the code/math content is preserved exactly.
 *
 * @param src the full markdown source.
 * @returns the source with span-internal pipes within tables escaped.
 */
export function escapeTableSpanPipes(src: string): string {
  if (src.indexOf("|") === -1) {
    return src;
  }

  const lines = src.split("\n");

  for (let i = 0; i < lines.length - 1; i++) {
    const header = lines[i];
    const delimiter = lines[i + 1];

    // A table begins with a header row containing a pipe immediately followed
    // by a delimiter row that itself contains a pipe.
    if (
      header.indexOf("|") === -1 ||
      delimiter.indexOf("|") === -1 ||
      !DELIMITER_ROW_REGEX.test(delimiter.trim())
    ) {
      continue;
    }

    // Escape the header and every body row until a blank line terminates the
    // table. The delimiter row itself never contains spans to escape.
    lines[i] = escapeSpanPipesInRow(header);
    let j = i + 2;
    while (j < lines.length && lines[j].trim() !== "") {
      lines[j] = escapeSpanPipesInRow(lines[j]);
      j++;
    }
    i = j - 1;
  }

  return lines.join("\n");
}

export default function markdownTables(md: MarkdownIt): void {
  // Escape pipes inside code/math spans before the block table rule splits
  // cells, so that those pipes are not mistaken for cell delimiters.
  md.core.ruler.before("block", "tables-pm-escape", (state) => {
    state.src = escapeTableSpanPipes(state.src);
    return false;
  });

  // insert a new rule after the "inline" rules are parsed
  md.core.ruler.after("inline", "tables-pm", (state) => {
    const tokens = state.tokens;
    let inside = false;

    for (let i = tokens.length - 1; i > 0; i--) {
      if (inside) {
        tokens[i].level--;
      }

      // convert unescaped \n and <br> tags in the text into real br tokens
      if (
        tokens[i].type === "inline" &&
        (tokens[i].content.match(BREAK_REGEX) ||
          tokens[i].content.match(BR_TAG_REGEX))
      ) {
        const existing = tokens[i].children || [];
        tokens[i].children = [];

        existing.forEach((child) => {
          // Skip processing math content to preserve LaTeX escape sequences
          if (child.type === "math_inline") {
            tokens[i].children?.push(child);
            return;
          }

          let content = child.content;

          // First handle <br> tags
          if (content.match(BR_TAG_REGEX) && child.type !== "code_inline") {
            content = content.replace(BR_TAG_REGEX, "\\n");
          }

          const breakParts = content.split(BREAK_REGEX);

          // a schema agnostic way to know if a node is inline code would be
          // great, for now we are stuck checking the node type.
          if (breakParts.length > 1 && child.type !== "code_inline") {
            breakParts.forEach((part, index) => {
              const token = new state.Token("text", "", 1);
              token.content = part.trim();
              tokens[i].children?.push(token);

              if (index < breakParts.length - 1) {
                const brToken = new state.Token("br", "br", 1);
                tokens[i].children?.push(brToken);
              }
            });
          } else {
            tokens[i].children?.push(child);
          }
        });
      }

      // filter out incompatible tokens from markdown-it that we don't need
      // in prosemirror. thead/tbody do nothing.
      if (
        ["thead_open", "thead_close", "tbody_open", "tbody_close"].includes(
          tokens[i].type
        )
      ) {
        inside = !inside;
        tokens.splice(i, 1);
      }

      if (["th_open", "td_open"].includes(tokens[i].type)) {
        // markdown-it table parser stores alignment as html styles, convert
        // to a simple string here
        const tokenAttrs = tokens[i].attrs;
        if (tokenAttrs) {
          const style = tokenAttrs[0][1];
          tokens[i].info = style.split(":")[1];
        }

        // Find the corresponding close token
        const closeType =
          tokens[i].type === "th_open" ? "th_close" : "td_close";
        let closeIndex = i + 2; // Start after inline token
        while (
          closeIndex < tokens.length &&
          tokens[closeIndex].type !== closeType
        ) {
          closeIndex++;
        }

        // Check if the cell content looks like a checkbox (or multiple checkboxes)
        const inlineToken = tokens[i + 1];
        if (inlineToken?.type !== "inline") {
          // No inline content, just add paragraph wrapper
          tokens.splice(
            closeIndex,
            0,
            new state.Token("paragraph_close", "p", -1)
          );
          tokens.splice(i + 1, 0, new state.Token("paragraph_open", "p", 1));
          continue;
        }

        // Split content by <br> to find all checkboxes
        const parts = inlineToken.content.split(BR_TAG_REGEX);
        const checkboxItems: Array<{ checked: boolean; label: string }> = [];

        for (const part of parts) {
          const match = part.trim().match(CHECKBOX_REGEX);
          if (match) {
            checkboxItems.push({
              checked: match[1].toLowerCase() === "x",
              label: match[2] || "",
            });
          }
        }

        if (checkboxItems.length > 0) {
          // Build tokens for all checkbox items
          const newTokens: InstanceType<typeof state.Token>[] = [];

          // Opening: checkbox_list_open
          newTokens.push(new state.Token("checkbox_list_open", "ul", 1));

          // Add each checkbox item
          for (const item of checkboxItems) {
            const itemOpen = new state.Token("checkbox_item_open", "li", 1);
            if (item.checked) {
              itemOpen.attrs = [["checked", "true"]];
            }
            newTokens.push(itemOpen);
            newTokens.push(new state.Token("paragraph_open", "p", 1));

            // Create inline token for the label
            const labelInline = new state.Token("inline", "", 0);
            labelInline.content = item.label;
            const textToken = new state.Token("text", "", 0);
            textToken.content = item.label;
            labelInline.children = [textToken];
            newTokens.push(labelInline);

            newTokens.push(new state.Token("paragraph_close", "p", -1));
            newTokens.push(new state.Token("checkbox_item_close", "li", -1));
          }

          // Closing: checkbox_list_close
          newTokens.push(new state.Token("checkbox_list_close", "ul", -1));

          // Replace the inline token with our new structure
          tokens.splice(i + 1, closeIndex - i - 1, ...newTokens);
        } else {
          // markdown-it table parser does not return paragraphs inside the cells
          // but prosemirror requires them, so we add 'em in here.
          // Insert closing token first (before closeIndex shifts)
          tokens.splice(
            closeIndex,
            0,
            new state.Token("paragraph_close", "p", -1)
          );
          // Then insert opening token
          tokens.splice(i + 1, 0, new state.Token("paragraph_open", "p", 1));
        }
      }
    }

    return false;
  });
}
