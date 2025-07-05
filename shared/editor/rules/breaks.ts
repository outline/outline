import MarkdownIt, { Token } from "markdown-it";

function isOldHardBreak(token: Token) {
  return token.type === "text" && token.content === "\\";
}

/** Markdown plugin to convert old encoded hard breaks to paragraphs */
export default function markdownBreakToParagraphs(md: MarkdownIt) {
  md.core.ruler.after("inline", "hardbreaks", (state) => {
    const tokens = state.tokens;

    // iterate through tokens and convert hardbreak tokens to br tokens
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.children) {
        for (let j = 0; j < token.children.length; j++) {
          const child = token.children[j];

          if (child.type === "hardbreak") {
            // convert hardbreak token to br token, we don't care about the difference
            child.type = "br";
            child.tag = "br";
            child.nesting = 0;
          }
        }
      }
    }

    return false;
  });

  // insert a new rule after the "inline" rules are parsed
  md.core.ruler.after("inline", "breaks", (state) => {
    const tokens = state.tokens;

    // work backwards through the tokens and find text that looks like a br
    for (let i = tokens.length - 1; i > 0; i--) {
      const tokenChildren = tokens[i].children || [];
      const matches = tokenChildren.filter(isOldHardBreak);

      if (matches.length) {
        let token;

        const nodes: Token[] = [];
        const children = tokenChildren.filter(
          (child) => !isOldHardBreak(child)
        );

        let count = matches.length;
        if (children.length) {
          count++;
        }

        for (let j = 0; j < count; j++) {
          const isLast = j === count - 1;

          token = new state.Token("paragraph_open", "p", 1);
          nodes.push(token);

          const text = new state.Token("text", "", 0);
          text.content = "";

          token = new state.Token("inline", "", 0);
          token.level = 1;
          token.children = isLast ? [text, ...children] : [text];
          token.content = "";
          nodes.push(token);

          token = new state.Token("paragraph_close", "p", -1);
          nodes.push(token);
        }

        tokens.splice(i - 1, 3, ...nodes);
      }
    }

    return false;
  });
}
