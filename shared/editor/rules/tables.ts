import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { unescapeRawTableCell } from "../lib/markdown/tableCell";

const BR_TAG_REGEX = /<br\s*\/?>/gi;

// Matches the opening of a notice (:::style), toggle (+++), code (```) or math
// ($$) fence
const FENCE_OPEN_REGEX = /^(?::::\S|\+{3,}|```|\$\$)/;

// Matches a line that opens a bullet, ordered, alpha or checkbox list item
const LIST_OPEN_REGEX = /^(?:[*+-]|\d+[.)]|[a-z]\.|\[[ \tx_-]\])[ \t]+\S/im;

// Matches a checkbox item that has no list marker, such as "[x] Task"
const BARE_CHECKBOX_REGEX = /^[ \t]*(\[[ \tx_-]\]\s)/gim;

const TABLE_SECTION_TYPES = [
  "thead_open",
  "thead_close",
  "tbody_open",
  "tbody_close",
];

const BLOCK_CELL_TYPES = [
  "container_notice_open",
  "container_toggle_open",
  "fence",
  "math_block",
  "bullet_list_open",
  "ordered_list_open",
  "checkbox_list_open",
];

/**
 * Find the offset of the first "\n" escape at or after the given offset that is
 * not itself escaped by a preceding backslash.
 *
 * A lookbehind assertion would say this in one regex, but Safari below 16.4
 * throws on lookbehind, so the preceding character is examined by hand.
 *
 * @param content - the text to scan.
 * @param from - the offset to start scanning at.
 * @returns the offset of the break, or -1 if there is none.
 */
function findBreak(content: string, from: number): number {
  let index = content.indexOf("\\n", from);
  while (index !== -1) {
    if (index === 0 || content[index - 1] !== "\\") {
      return index;
    }
    index = content.indexOf("\\n", index + 2);
  }
  return -1;
}

/**
 * Check whether the text holds a "\n" escape that is not itself escaped.
 *
 * @param content - the text to scan.
 * @returns true if the text holds an unescaped break.
 */
function hasBreak(content: string): boolean {
  return findBreak(content, 0) !== -1;
}

/**
 * Split the text on each "\n" escape that is not itself escaped, leaving
 * escaped ones in place.
 *
 * @param content - the text to split.
 * @returns the parts between the breaks.
 */
function splitOnBreaks(content: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let index = findBreak(content, start);

  while (index !== -1) {
    parts.push(content.slice(start, index));
    start = index + 2;
    index = findBreak(content, start);
  }

  parts.push(content.slice(start));
  return parts;
}

/**
 * Block content (notice, toggle, code & math fences, lists) is serialized onto
 * a single table-cell line using <br> in place of newlines so it does not
 * break the row. Reconstruct it by re-parsing the un-flattened source,
 * round-tripping back to the original block rather than leaving literal
 * markers as text.
 *
 * @param md - the markdown-it instance, used to re-parse the cell source.
 * @param content - the raw inline content of the cell.
 * @param env - the markdown-it environment, forwarded to the nested parse.
 * @returns the reconstructed block tokens, or null if the cell is not a block.
 */
function parseBlockCell(
  md: MarkdownIt,
  content: string,
  env: unknown
): ReturnType<MarkdownIt["parse"]> | null {
  const source = content.replace(BR_TAG_REGEX, "\n");
  let markdown: string;

  // A fenced block spans multiple lines and opens with its fence marker.
  if (source.includes("\n") && FENCE_OPEN_REGEX.test(source)) {
    // Code & math fences are raw, so the parser won't undo the escaping the
    // serializer added to keep the cell intact — reverse it here. Notice and
    // toggle content is inline, so markdown unescapes it on re-parse.
    const isRawFence = source.startsWith("```") || source.startsWith("$$");
    markdown = isRawFence ? unescapeRawTableCell(source) : source;
  } else if (LIST_OPEN_REGEX.test(source)) {
    // Keep each <br> as a hard break, and add the list marker that checkbox
    // items may be written without, such as "[x] Task".
    markdown = content
      .replace(BR_TAG_REGEX, "  \n")
      .replace(BARE_CHECKBOX_REGEX, "- $1");
  } else {
    return null;
  }

  const tokens = md.parse(markdown, env);
  return tokens.some((token) => BLOCK_CELL_TYPES.includes(token.type))
    ? tokens
    : null;
}

/**
 * Split the text children of an inline token on each <br> tag and unescaped
 * "\n" escape, placing a br token at each break.
 *
 * @param createToken - creates a new token of the given type and tag.
 * @param children - the children of the inline token.
 * @returns the new children.
 */
function splitChildrenOnBreaks(
  createToken: (type: string, tag: string) => Token,
  children: Token[]
): Token[] {
  const result: Token[] = [];

  children.forEach((child) => {
    // Skip processing math content to preserve LaTeX escape sequences
    if (child.type === "math_inline") {
      result.push(child);
      return;
    }

    let content = child.content;

    // First handle <br> tags
    if (content.match(BR_TAG_REGEX) && child.type !== "code_inline") {
      content = content.replace(BR_TAG_REGEX, "\\n");
    }

    const breakParts = splitOnBreaks(content);

    // a schema agnostic way to know if a node is inline code would be
    // great, for now we are stuck checking the node type.
    if (breakParts.length > 1 && child.type !== "code_inline") {
      breakParts.forEach((part, index) => {
        // Trim only around the breaks, keeping spaces next to siblings.
        let text = index > 0 ? part.trimStart() : part;
        if (index < breakParts.length - 1) {
          text = text.trimEnd();
        }
        const token = createToken("text", "");
        token.content = text;
        result.push(token);

        if (index < breakParts.length - 1) {
          result.push(createToken("br", "br"));
        }
      });
    } else {
      result.push(child);
    }
  });

  return result;
}

export default function markdownTables(md: MarkdownIt): void {
  // insert a new rule after the "inline" rules are parsed
  md.core.ruler.after("inline", "tables-pm", (state) => {
    const tokens = state.tokens;

    // convert unescaped \n and <br> tags in the text into real br tokens
    for (let i = 1; i < tokens.length; i++) {
      if (
        tokens[i].type === "inline" &&
        (hasBreak(tokens[i].content) || tokens[i].content.match(BR_TAG_REGEX))
      ) {
        tokens[i].children = splitChildrenOnBreaks(
          (type, tag) => new state.Token(type, tag, 1),
          tokens[i].children || []
        );
      }
    }

    // The output is built in a single pass, splicing into the token array for
    // each cell is quadratic for documents with many table cells.
    const result: Token[] = tokens.length ? [tokens[0]] : [];
    let inside = false;
    let paragraphCloseIndex = -1;

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (i === paragraphCloseIndex) {
        result.push(new state.Token("paragraph_close", "p", -1));
      }

      // filter out incompatible tokens from markdown-it that we don't need
      // in prosemirror. thead/tbody do nothing.
      if (TABLE_SECTION_TYPES.includes(token.type)) {
        inside = token.type === "thead_open" || token.type === "tbody_open";
        continue;
      }

      if (inside) {
        token.level--;
      }

      result.push(token);

      if (token.type !== "th_open" && token.type !== "td_open") {
        continue;
      }

      // markdown-it table parser stores alignment as html styles, convert
      // to a simple string here
      if (token.attrs) {
        const style = token.attrs[0][1];
        token.info = style.split(":")[1];
      }

      // Find the corresponding close token
      const closeType = token.type === "th_open" ? "th_close" : "td_close";
      let closeIndex = i + 2; // Start after inline token
      while (
        closeIndex < tokens.length &&
        tokens[closeIndex].type !== closeType
      ) {
        closeIndex++;
      }

      const inlineToken = tokens[i + 1];
      if (inlineToken?.type === "inline") {
        // Reconstruct block content that was serialized onto a single line,
        // replacing the inline token with the block tokens.
        const blockTokens = parseBlockCell(md, inlineToken.content, state.env);
        if (blockTokens) {
          for (const blockToken of blockTokens) {
            result.push(blockToken);
          }
          i = closeIndex - 1;
          continue;
        }
      }

      // markdown-it table parser does not return paragraphs inside the cells
      // but prosemirror requires them, so we add 'em in here.
      result.push(new state.Token("paragraph_open", "p", 1));
      paragraphCloseIndex = closeIndex;
    }

    if (paragraphCloseIndex >= tokens.length) {
      result.push(new state.Token("paragraph_close", "p", -1));
    }

    state.tokens = result;
    return false;
  });
}
