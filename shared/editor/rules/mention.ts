import MarkdownIt from "markdown-it";
import StateCore from "markdown-it/lib/rules_core/state_core";
import Token from "markdown-it/lib/token";

function renderMention(tokens: Token[], idx: number) {
  const type = tokens[idx].attrGet("data-type");
  const id = tokens[idx].attrGet("data-id");
  const label = tokens[idx].content;

  return `<span class="mention" data-type="${type}" data-id="${id}">${label}</span>`;
}

function parseUri(uri: string) {
  const url = new URL(uri);
  const parts = url.pathname.split("/");

  return {
    type: parts[parts.length - 2],
    id: parts[parts.length - 1],
  };
}

function parseMentions(state: StateCore) {
  const scanRE = /(?:^|\s)@\[[a-zA-Z\s]+\]\(mention:\/\/[a-z]+\/[a-z0-9-]+\)/;

  for (let i = 0; i < state.tokens.length; i++) {
    const tok = state.tokens[i];
    if (tok.type !== "inline") {
      continue;
    }
    if (!scanRE.test(tok.content)) {
      continue;
    }

    const [prefixToken, openToken, labelToken] = tok.children!.slice(0, 3);
    prefixToken.content = prefixToken.content.slice(0, -1);

    const href = openToken.attrs![0];
    const { type, id } = parseUri(href![1]);

    const mentionToken = new Token("mention", "", 0);
    mentionToken.attrSet("data-type", type);
    mentionToken.attrSet("data-id", id);
    mentionToken.content = labelToken.content;

    state.tokens[i].children!.splice(1, 3, mentionToken);
  }
}

export default function mention(md: MarkdownIt) {
  md.renderer.rules.mention = renderMention;
  md.core.ruler.after("inline", "mention", parseMentions);
}
