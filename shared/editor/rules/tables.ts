import type MarkdownIt from "markdown-it";

const BREAK_REGEX = /(?<=^|[^\\])\\n/;
const BR_TAG_REGEX = /<br\s*\/?>/gi;
// Matches checkbox syntax with optional list prefix: "- [x] Task" or "[x] Task"
// Stops at <br> or newline to handle multiple checkboxes in a cell
const CHECKBOX_REGEX = /^(?:-\s*)?\[(X|\s|_|-)\]\s([^<\n]*)?/i;

export default function markdownTables(md: MarkdownIt): void {
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
