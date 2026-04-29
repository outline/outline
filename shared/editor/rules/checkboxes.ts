import type { Token } from "markdown-it";
import type MarkdownIt from "markdown-it";

const CHECKBOX_REGEX = /\[(X|\s|_|-)\]\s(.*)?/i;

function matches(token: Token | undefined) {
  return token && token.content.match(CHECKBOX_REGEX);
}

function isInline(token: Token | undefined): boolean {
  return !!token && token.type === "inline";
}

function isParagraph(token: Token | undefined): boolean {
  return !!token && token.type === "paragraph_open";
}

function isListItem(token: Token | undefined): boolean {
  // Only match list_item_open, not checkbox_item_open - items that are already
  // checkbox_item_open have been processed (e.g., by the tables rule for
  // checkboxes in table cells) and should not be processed again.
  return !!token && token.type === "list_item_open";
}

function looksLikeChecklist(tokens: Token[], index: number) {
  return (
    isInline(tokens[index]) &&
    isListItem(tokens[index - 2]) &&
    isParagraph(tokens[index - 1]) &&
    matches(tokens[index])
  );
}

export default function markdownItCheckbox(md: MarkdownIt): void {
  function render(tokens: Token[], idx: number) {
    const token = tokens[idx];
    const checked = !!token.attrGet("checked");

    if (token.nesting === 1) {
      // opening tag
      return `<li class="checkbox-list-item"><span class="checkbox ${
        checked ? "checked" : ""
      }">${checked ? "[x]" : "[ ]"}</span>`;
    } else {
      // closing tag
      return "</li>\n";
    }
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
        if (tokens[i - 3].type === "bullet_list_open") {
          tokens[i - 3].type = "checkbox_list_open";
        }

        if (tokens[i + 3].type === "bullet_list_close") {
          tokens[i + 3].type = "checkbox_list_close";
        }

        // remove [ ] [x] from list item label – must use the content from the
        // child for escaped characters to be unescaped correctly.
        const tokenChildren = tokens[i].children;
        if (tokenChildren && tokenChildren[0].type === "text") {
          const contentMatches = tokenChildren[0].content.match(CHECKBOX_REGEX);

          if (contentMatches) {
            const label = contentMatches[2];

            tokens[i].content = label;
            tokenChildren[0].content = label;
          }
        }

        // open list item and ensure checked state is transferred
        tokens[i - 2].type = "checkbox_item_open";

        if (checked === true) {
          tokens[i - 2].attrs = [["checked", "true"]];
        }

        // close the list item
        let j = i;
        while (
          tokens[j] &&
          tokens[j].type !== "list_item_close" &&
          tokens[j].type !== "checkbox_item_close"
        ) {
          j++;
        }
        if (tokens[j]) {
          tokens[j].type = "checkbox_item_close";
        }
      }
    }

    // Second pass: convert any remaining direct child list_item tokens inside
    // a checkbox_list to checkbox_item so they aren't silently dropped by the
    // Prosemirror schema which requires checkbox_item+ children.
    const checkboxListOpenLevels: number[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === "checkbox_list_open") {
        checkboxListOpenLevels.push(token.level);
      } else if (token.type === "checkbox_list_close") {
        checkboxListOpenLevels.pop();
      } else if (checkboxListOpenLevels.length > 0) {
        const checkboxListOpenLevel =
          checkboxListOpenLevels[checkboxListOpenLevels.length - 1];
        const isDirectChild = token.level === checkboxListOpenLevel + 1;

        if (isDirectChild && token.type === "list_item_open") {
          token.type = "checkbox_item_open";
        } else if (isDirectChild && token.type === "list_item_close") {
          token.type = "checkbox_item_close";
        }
      }
    }

    return false;
  });
}
