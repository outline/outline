import type { Token } from "markdown-it";
import type MarkdownIt from "markdown-it";

const CHECKBOX_REGEX = /\[(X|\s|_|-)\]\s(.*)?/i;

// For table cells we want to match the entire cell content like:
// "- [ ] test" or "[x] test"
const TABLE_CELL_CHECKBOX_REGEX = /^\s*-?\s*\[(x|\s|_|-)\]\s*(.*)?$/i;

function matches(token: Token | void) {
  return token && token.content.match(CHECKBOX_REGEX);
}

function isInline(token: Token | void): boolean {
  return !!token && token.type === "inline";
}

function isParagraph(token: Token | void): boolean {
  return !!token && token.type === "paragraph_open";
}

function isListItem(token: Token | void): boolean {
  return (
    !!token &&
    (token.type === "list_item_open" || token.type === "checkbox_item_open")
  );
}

function looksLikeChecklist(tokens: Token[], index: number) {
  return (
    isInline(tokens[index]) &&
    isListItem(tokens[index - 2]) &&
    isParagraph(tokens[index - 1]) &&
    matches(tokens[index])
  );
}

function looksLikeChecklistInTableCell(tokens: Token[], index: number) {
  if (
    isInline(tokens[index]) &&
    isParagraph(tokens[index - 1]) &&
    (tokens[index - 2]?.type === "td_open" || tokens[index - 2]?.type === "th_open")
  ) {
    return (tokens[index].content || "").match(TABLE_CELL_CHECKBOX_REGEX);
  }
  return null;
}

export default function markdownItCheckbox(md: MarkdownIt): void {
  function render(tokens: Token[], idx: number) {
    const token = tokens[idx];
    const checked = token.attrGet("checked") === "true";

    if (token.nesting === 1) {
      // opening tag
      return `<li class="checkbox-list-item"><span class="checkbox ${checked ? "checked" : ""
        }">${checked ? "[x]" : "[ ]"}</span>`;
    }

    // closing tag
    return "</li>\n";
  }

  md.renderer.rules.checkbox_item_open = render;
  md.renderer.rules.checkbox_item_close = render;

  // insert a new rule after the "inline" rules are parsed
  md.core.ruler.after("inline", "checkboxes", (state) => {
    const tokens = state.tokens;

    // work backwards through the tokens and find text that looks like a checkbox
    for (let i = tokens.length - 1; i > 0; i--) {
      const matchesChecklist = looksLikeChecklist(tokens, i);
      if (matchesChecklist) {
        const value = matchesChecklist[1];
        const checked = value.toLowerCase() === "x";

        // convert surrounding list tokens
        if (tokens[i - 3]?.type === "bullet_list_open") {
          tokens[i - 3].type = "checkbox_list_open";
        }

        if (tokens[i + 3]?.type === "bullet_list_close") {
          tokens[i + 3].type = "checkbox_list_close";
        }

        // remove [ ] [x] from list item label – must use the content from the
        // child for escaped characters to be unescaped correctly.
        const tokenChildren = tokens[i].children;
        if (tokenChildren) {
          const firstText = tokenChildren.find((t) => t.type === "text");
          if (firstText) {
            const contentMatches = firstText.content.match(CHECKBOX_REGEX);
            if (contentMatches) {
              const label = contentMatches[2] ?? "";
              tokens[i].content = label;
              firstText.content = label;
            }
          }
        }

        // open list item and ensure checked state is transferred
        tokens[i - 2].type = "checkbox_item_open";

        if (checked === true) {
          tokens[i - 2].attrs = [["checked", "true"]];
        }

        // close the list item
        let j = i;
        while (j < tokens.length && tokens[j].type !== "list_item_close") {
          j++;
        }
        if (j < tokens.length) {
          tokens[j].type = "checkbox_item_close";
        }

        continue;
      }

      // Table cell checklist: rewrite to plain symbols to avoid ProseMirror token errors
      const inTable = looksLikeChecklistInTableCell(tokens, i);
      if (inTable) {
        const checked = inTable[1].toLowerCase() === "x";
        const label = inTable[2] ?? "";

        const symbol = checked ? "☑" : "☐";
        const inline = tokens[i];

        // Replace rendered plain content
        inline.content = `${symbol} ${label}`;

        // Also replace child text so it doesn't render the old "- [ ] ..."
        const children = inline.children;
        if (children && children.length) {
          const firstText = children.find((t) => t.type === "text");
          if (firstText) firstText.content = `${symbol} ${label}`;
        }
      }
    }

    return false;
  });
}