import MarkdownIt from "markdown-it";

const BREAK_REGEX = /(?:^|[^\\])\\n/;

export default function markdownTables(md: MarkdownIt): void {
  // insert a new rule after the "inline" rules are parsed
  md.core.ruler.after("inline", "tables-pm", (state) => {
    const tokens = state.tokens;
    let inside = false;

    for (let i = tokens.length - 1; i > 0; i--) {
      if (inside) {
        tokens[i].level--;
      }

      // convert unescaped \n in the text into real br tag
      if (tokens[i].type === "inline" && tokens[i].content.match(BREAK_REGEX)) {
        const existing = tokens[i].children || [];
        tokens[i].children = [];

        existing.forEach((child) => {
          const breakParts = child.content.split(BREAK_REGEX);

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
        // markdown-it table parser does not return paragraphs inside the cells
        // but prosemirror requires them, so we add 'em in here.
        tokens.splice(i + 1, 0, new state.Token("paragraph_open", "p", 1));

        // markdown-it table parser stores alignment as html styles, convert
        // to a simple string here
        const tokenAttrs = tokens[i].attrs;
        if (tokenAttrs) {
          const style = tokenAttrs[0][1];
          tokens[i].info = style.split(":")[1];
        }
      }

      if (["th_close", "td_close"].includes(tokens[i].type)) {
        tokens.splice(i, 0, new state.Token("paragraph_close", "p", -1));
      }
    }

    return false;
  });
}
