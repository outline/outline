import MarkdownIt, { StateBlock, StateInline } from "markdown-it";

export const REGEX_INLINE_MATH_DOLLARS = /\$\$(.+)\$\$/;

export const REGEX_BLOCK_MATH_DOLLARS = /\$\$\$\s+$/;

const inlineMathDelimiter = "$";
const blockMathDelimiter = "$$";

// test if potential opening or closing delimiter
// assumes that there is a "$" at state.src[pos]
function isValidDelimiter(state: StateInline, pos: number) {
  const max = state.posMax;
  let canOpen = true,
    canClose = true;

  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

  // check non-whitespace conditions for open/close, and
  // check that closing delimiter isn't followed by a number
  if (
    prevChar === 0x20 || // " "
    prevChar === 0x09 || // "\t"
    (nextChar >= 0x30 && nextChar <= 0x39) // "0" - "9"
  ) {
    canClose = false;
  }

  if (nextChar === 0x20 || nextChar === 0x09) {
    canOpen = false;
  }

  return { canOpen, canClose };
}

function mathInline(state: StateInline, silent: boolean): boolean {
  let match, token, res, pos;

  if (
    state.src.slice(state.pos, state.pos + inlineMathDelimiter.length) !==
    inlineMathDelimiter
  ) {
    return false;
  }

  res = isValidDelimiter(state, state.pos);
  if (!res.canOpen) {
    if (!silent) {
      state.pending += "$";
    }
    state.pos += 1;
    return true;
  }

  // first check for and bypass all properly escaped delimiters
  // this loop will assume that the first leading backtick can not
  // be the first character in state.src, which is known since
  // we have found an opening delimiter already
  const start = state.pos + inlineMathDelimiter.length;
  match = start;
  while ((match = state.src.indexOf(inlineMathDelimiter, match)) !== 1) {
    // found potential delimeter, look for escapes, pos will point to
    // first non escape when complete
    pos = match - 1;
    while (state.src[pos] === "\\") {
      pos -= 1;
    }

    // even number of escapes, potential closing delimiter found
    if ((match - pos) % 2 === 1) {
      break;
    }
    match += 1;
  }

  // no closing delimiter found, consume $ and continue
  if (match === -1) {
    if (!silent) {
      state.pending += "$";
    }
    state.pos = start;
    return true;
  }

  // check if we have empty content (ex. $$) do not parse
  if (match - start === 0) {
    if (!silent) {
      state.pending += inlineMathDelimiter + inlineMathDelimiter;
    }
    state.pos = start + inlineMathDelimiter.length;
    return true;
  }

  // check for valid closing delimiter
  res = isValidDelimiter(state, match);
  if (!res.canClose) {
    if (!silent) {
      state.pending += "$";
    }
    state.pos = start;
    return true;
  }

  if (!silent) {
    token = state.push("math_inline", "math", 0);
    token.markup = inlineMathDelimiter;
    token.content = state.src.slice(start, match);
  }

  state.pos = match + inlineMathDelimiter.length;
  return true;
}

function mathDisplay(
  state: StateBlock,
  start: number,
  end: number,
  silent: boolean
) {
  let firstLine,
    lastLine,
    next,
    lastPos,
    found = false,
    pos = state.bMarks[start] + state.tShift[start],
    max = state.eMarks[start];

  if (pos + blockMathDelimiter.length > max) {
    return false;
  }
  if (
    state.src.slice(pos, pos + blockMathDelimiter.length) !== blockMathDelimiter
  ) {
    return false;
  }

  pos += blockMathDelimiter.length;
  firstLine = state.src.slice(pos, max);

  if (silent) {
    return true;
  }
  if (
    firstLine.trim().slice(-blockMathDelimiter.length) === blockMathDelimiter
  ) {
    // Single line expression
    firstLine = firstLine.trim().slice(0, -blockMathDelimiter.length);
    found = true;
  }

  for (next = start; !found; ) {
    next++;

    if (next >= end) {
      break;
    }

    pos = state.bMarks[next] + state.tShift[next];
    max = state.eMarks[next];

    if (pos < max && state.tShift[next] < state.blkIndent) {
      // non-empty line with negative indent should stop the list:
      break;
    }

    if (state.src.slice(pos, max).trim().slice(-3) === blockMathDelimiter) {
      lastPos = state.src.slice(0, max).lastIndexOf(blockMathDelimiter);
      lastLine = state.src.slice(pos, lastPos);
      found = true;
    }
  }

  state.line = next + 1;

  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.content =
    (firstLine && firstLine.trim() ? firstLine + "\n" : "") +
    state.getLines(start + 1, next, state.tShift[start], true) +
    (lastLine && lastLine.trim() ? lastLine : "");
  token.map = [start, state.line];
  token.markup = blockMathDelimiter;
  return true;
}

export default function markdownMath(md: MarkdownIt) {
  md.inline.ruler.after("escape", "math_inline", mathInline);
  md.block.ruler.after("blockquote", "math_block", mathDisplay, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
}
