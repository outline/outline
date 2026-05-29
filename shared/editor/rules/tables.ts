import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";

const BREAK_REGEX = /(?<=^|[^\\])\\n/;
const BR_TAG_REGEX = /<br\s*\/?>/gi;
// Matches checkbox syntax with optional list prefix: "- [x] Task" or "[x] Task"
// Stops at <br> or newline to handle multiple checkboxes in a cell
const CHECKBOX_REGEX = /^(?:-\s*)?\[(X|\s|_|-)\]\s([^<\n]*)?/i;

const TAB = 0x09;
const SPACE = 0x20;
const DOLLAR = 0x24;
const BACKSLASH = 0x5c;
const BACKTICK = 0x60;
const PIPE = 0x7c;
const HYPHEN = 0x2d;
const COLON = 0x3a;
const DIGIT_0 = 0x30;
const DIGIT_9 = 0x39;
const MAX_AUTOCOMPLETED_CELLS = 0x10000;

function isSpace(code: number): boolean {
  return code === SPACE || code === TAB;
}

/**
 * Skip over a backtick-delimited code span starting at `pos`.
 *
 * @returns the position just past the closing run if a balanced span exists,
 * otherwise -1 (indicating the backticks at `pos` are literal text).
 */
function skipCodeSpan(str: string, pos: number): number {
  const max = str.length;
  const runStart = pos;
  while (pos < max && str.charCodeAt(pos) === BACKTICK) {
    pos++;
  }
  const tickCount = pos - runStart;

  let scan = pos;
  while (scan < max) {
    if (str.charCodeAt(scan) !== BACKTICK) {
      scan++;
      continue;
    }
    const closeStart = scan;
    while (scan < max && str.charCodeAt(scan) === BACKTICK) {
      scan++;
    }
    if (scan - closeStart === tickCount) {
      return scan;
    }
  }
  return -1;
}

/**
 * Skip over an inline $...$ math span starting at `pos`.
 *
 * Mirrors the opener/closer constraints used by the math inline rule so that
 * literal dollar amounts (e.g. "$5") do not accidentally consume a cell.
 *
 * @returns the position just past the closing `$` if a balanced span exists,
 * otherwise -1.
 */
function skipMathSpan(str: string, pos: number): number {
  const max = str.length;
  // Opener: next char must not be whitespace.
  const next = pos + 1 < max ? str.charCodeAt(pos + 1) : -1;
  if (next === -1 || isSpace(next)) {
    return -1;
  }

  let scan = pos + 1;
  while (scan < max) {
    const ch = str.charCodeAt(scan);
    if (ch === BACKSLASH) {
      // Skip escaped char.
      scan += 2;
      continue;
    }
    if (ch === DOLLAR) {
      const prev = str.charCodeAt(scan - 1);
      const after = scan + 1 < max ? str.charCodeAt(scan + 1) : -1;
      // Closer: prev not whitespace, next not a digit.
      if (!isSpace(prev) && !(after >= DIGIT_0 && after <= DIGIT_9)) {
        return scan + 1;
      }
    }
    scan++;
  }
  return -1;
}

/**
 * Split a table row on unescaped pipes, while ignoring pipes that fall inside
 * inline code spans or inline math spans. This is a superset of markdown-it's
 * default behaviour, which only honours `\|` escapes and so silently truncates
 * cells whose content contains literal `|` characters inside `` `...` `` or
 * `$...$`.
 */
function escapedSplit(str: string): string[] {
  const result: string[] = [];
  const max = str.length;

  let pos = 0;
  let isEscaped = false;
  let lastPos = 0;
  let current = "";

  while (pos < max) {
    const ch = str.charCodeAt(pos);

    if (!isEscaped && ch === BACKTICK) {
      const end = skipCodeSpan(str, pos);
      if (end !== -1) {
        pos = end;
        isEscaped = false;
        continue;
      }
    } else if (!isEscaped && ch === DOLLAR) {
      const end = skipMathSpan(str, pos);
      if (end !== -1) {
        pos = end;
        isEscaped = false;
        continue;
      }
    }

    if (ch === PIPE) {
      if (!isEscaped) {
        result.push(current + str.substring(lastPos, pos));
        current = "";
        lastPos = pos + 1;
      } else {
        // Escaped pipe `\|` becomes part of the current cell, dropping the
        // leading backslash.
        current += str.substring(lastPos, pos - 1);
        lastPos = pos;
      }
    }

    isEscaped = ch === BACKSLASH;
    pos++;
  }

  result.push(current + str.substring(lastPos));
  return result;
}

function getLine(state: StateBlock, line: number): string {
  const pos = state.bMarks[line] + state.tShift[line];
  const max = state.eMarks[line];
  return state.src.slice(pos, max);
}

/**
 * GFM table block rule, forked from markdown-it. The only behavioural change
 * from the upstream rule is that {@link escapedSplit} also recognises
 * backtick-delimited code spans and `$...$` math spans, so pipes inside such
 * spans no longer split the row.
 */
function tableRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
): boolean {
  if (startLine + 2 > endLine) {
    return false;
  }

  let nextLine = startLine + 1;
  if (state.sCount[nextLine] < state.blkIndent) {
    return false;
  }
  if (state.sCount[nextLine] - state.blkIndent >= 4) {
    return false;
  }

  let pos = state.bMarks[nextLine] + state.tShift[nextLine];
  if (pos >= state.eMarks[nextLine]) {
    return false;
  }

  const firstCh = state.src.charCodeAt(pos++);
  if (firstCh !== PIPE && firstCh !== HYPHEN && firstCh !== COLON) {
    return false;
  }
  if (pos >= state.eMarks[nextLine]) {
    return false;
  }

  const secondCh = state.src.charCodeAt(pos++);
  if (
    secondCh !== PIPE &&
    secondCh !== HYPHEN &&
    secondCh !== COLON &&
    !isSpace(secondCh)
  ) {
    return false;
  }
  if (firstCh === HYPHEN && isSpace(secondCh)) {
    return false;
  }

  while (pos < state.eMarks[nextLine]) {
    const ch = state.src.charCodeAt(pos);
    if (ch !== PIPE && ch !== HYPHEN && ch !== COLON && !isSpace(ch)) {
      return false;
    }
    pos++;
  }

  let lineText = getLine(state, startLine + 1);
  let columns = lineText.split("|");
  const aligns: string[] = [];
  for (let i = 0; i < columns.length; i++) {
    const t = columns[i].trim();
    if (!t) {
      if (i === 0 || i === columns.length - 1) {
        continue;
      } else {
        return false;
      }
    }
    if (!/^:?-+:?$/.test(t)) {
      return false;
    }
    if (t.charCodeAt(t.length - 1) === COLON) {
      aligns.push(t.charCodeAt(0) === COLON ? "center" : "right");
    } else if (t.charCodeAt(0) === COLON) {
      aligns.push("left");
    } else {
      aligns.push("");
    }
  }

  lineText = getLine(state, startLine).trim();
  if (lineText.indexOf("|") === -1) {
    return false;
  }
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  columns = escapedSplit(lineText);
  if (columns.length && columns[0] === "") {
    columns.shift();
  }
  if (columns.length && columns[columns.length - 1] === "") {
    columns.pop();
  }

  const columnCount = columns.length;
  if (columnCount === 0 || columnCount !== aligns.length) {
    return false;
  }

  if (silent) {
    return true;
  }

  const oldParentType = state.parentType;
  // The StateBlock type only knows the standard parent-type strings. Casting
  // keeps us in lockstep with the upstream rule.
  state.parentType = "table" as typeof state.parentType;

  const terminatorRules = state.md.block.ruler.getRules("blockquote");

  const tableTokenOpen = state.push("table_open", "table", 1);
  const tableLines: [number, number] = [startLine, 0];
  tableTokenOpen.map = tableLines;

  const tHeadOpen = state.push("thead_open", "thead", 1);
  tHeadOpen.map = [startLine, startLine + 1];

  const headerRowOpen = state.push("tr_open", "tr", 1);
  headerRowOpen.map = [startLine, startLine + 1];

  for (let i = 0; i < columns.length; i++) {
    const thOpen = state.push("th_open", "th", 1);
    if (aligns[i]) {
      thOpen.attrs = [["style", "text-align:" + aligns[i]]];
    }
    const inlineToken = state.push("inline", "", 0);
    inlineToken.content = columns[i].trim();
    inlineToken.children = [];
    state.push("th_close", "th", -1);
  }

  state.push("tr_close", "tr", -1);
  state.push("thead_close", "thead", -1);

  let tBodyLines: [number, number] | undefined;
  let autocompletedCells = 0;

  for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
    if (state.sCount[nextLine] < state.blkIndent) {
      break;
    }

    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) {
      break;
    }

    lineText = getLine(state, nextLine).trim();
    if (!lineText) {
      break;
    }
    if (state.sCount[nextLine] - state.blkIndent >= 4) {
      break;
    }

    columns = escapedSplit(lineText);
    if (columns.length && columns[0] === "") {
      columns.shift();
    }
    if (columns.length && columns[columns.length - 1] === "") {
      columns.pop();
    }

    autocompletedCells += columnCount - columns.length;
    if (autocompletedCells > MAX_AUTOCOMPLETED_CELLS) {
      break;
    }

    if (nextLine === startLine + 2) {
      const tBodyOpen = state.push("tbody_open", "tbody", 1);
      tBodyLines = [startLine + 2, 0];
      tBodyOpen.map = tBodyLines;
    }

    const rowOpen = state.push("tr_open", "tr", 1);
    rowOpen.map = [nextLine, nextLine + 1];

    for (let i = 0; i < columnCount; i++) {
      const tdOpen = state.push("td_open", "td", 1);
      if (aligns[i]) {
        tdOpen.attrs = [["style", "text-align:" + aligns[i]]];
      }
      const inlineToken = state.push("inline", "", 0);
      inlineToken.content = columns[i] ? columns[i].trim() : "";
      inlineToken.children = [];
      state.push("td_close", "td", -1);
    }
    state.push("tr_close", "tr", -1);
  }

  if (tBodyLines) {
    state.push("tbody_close", "tbody", -1);
    tBodyLines[1] = nextLine;
  }

  state.push("table_close", "table", -1);
  tableLines[1] = nextLine;

  state.parentType = oldParentType;
  state.line = nextLine;
  return true;
}

export default function markdownTables(md: MarkdownIt): void {
  // Replace the built-in GFM table rule with one that ignores pipes inside
  // inline code and math spans when splitting cells. Without this, content
  // such as `` `|a-b|` `` would silently split a row into extra cells and
  // truncate the document on round-trip.
  md.block.ruler.at("table", tableRule, { alt: ["paragraph", "reference"] });

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
