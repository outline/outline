import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

const CHECKBOX_REGEX = /^\[(X|\s|_|-)\]\s(.*)?/i;

function matches(token: Token) {
  return token && token.content.match(CHECKBOX_REGEX);
}

function isInline(token: Token): boolean {
  return !!token && token.type === "inline";
}

function isParagraph(token: Token): boolean {
  return !!token && token.type === "paragraph_open";
}

function isListItem(token: Token): boolean {
  // Only match list_item_open, not checkbox_item_open - items that are already
  // checkbox_item_open have been processed (e.g., by the tables rule for
  // checkboxes in table cells) and should not be processed again.
  return !!token && token.type === "list_item_open";
}

function isListOpen(token: Token): boolean {
  return (
    token.type === "bullet_list_open" ||
    token.type === "ordered_list_open" ||
    token.type === "checkbox_list_open"
  );
}

function isListClose(token: Token): boolean {
  return (
    token.type === "bullet_list_close" ||
    token.type === "ordered_list_close" ||
    token.type === "checkbox_list_close"
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

        // mark the list item, the enclosing list is converted in the next pass.
        tokens[i - 2].type = "checkbox_item_open";

        if (checked === true) {
          tokens[i - 2].attrs = [["checked", "true"]];
        }
      }
    }

    // Second pass: convert each list that holds a checkbox item to a
    // checkbox_list, including its plain direct child items, so they aren't
    // silently dropped by the Prosemirror schema which requires checkbox_item+
    // children.
    const lists: { open: Token; items: Token[]; isChecklist: boolean }[] = [];
    for (const token of tokens) {
      if (isListOpen(token)) {
        lists.push({
          open: token,
          items: [],
          isChecklist: token.type === "checkbox_list_open",
        });
        continue;
      }

      const list = lists[lists.length - 1];
      if (!list) {
        continue;
      }

      if (isListClose(token)) {
        lists.pop();
        if (list.isChecklist) {
          list.open.type = "checkbox_list_open";
          token.type = "checkbox_list_close";
          for (const item of list.items) {
            item.type =
              item.type === "list_item_open"
                ? "checkbox_item_open"
                : "checkbox_item_close";
          }
        }
      } else if (token.level === list.open.level + 1) {
        if (token.type === "checkbox_item_open") {
          list.isChecklist = true;
        } else if (
          token.type === "list_item_open" ||
          token.type === "list_item_close"
        ) {
          list.items.push(token);
        }
      }
    }

    return false;
  });
}
