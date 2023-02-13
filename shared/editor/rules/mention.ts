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
  const WINDOW_SIZE = 4;

  for (let i = 0; i < state.tokens.length; i++) {
    const tok = state.tokens[i];
    if (!(tok.type === "inline" && scanRE.test(tok.content) && tok.children)) {
      continue;
    }

    const canChunkComposeMentionToken = (chunk: Token[]) => {
      if (chunk.length < 4) {
        return false;
      }

      const [precToken, openToken, textToken, closeToken] = chunk;
      return (
        precToken.content.endsWith("@") &&
        openToken.type === "link_open" &&
        textToken.content &&
        closeToken.type === "link_close"
      );
    };

    const chunkWithMentionToken = (chunk: Token[]) => {
      const [precToken, openToken, textToken] = chunk;

      // remove "@" from preceding token
      precToken.content = precToken.content.slice(0, -1);

      // href must be present, otherwise the scanRE test above would've failed
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const href = openToken.attrs![0];
      const { type, id } = parseUri(href[1]);

      const mentionToken = new Token("mention", "", 0);
      mentionToken.attrSet("data-type", type);
      mentionToken.attrSet("data-id", id);
      mentionToken.content = textToken.content;

      return [precToken, mentionToken];
    };

    let newChildren: Token[] = [];
    let j = 0;
    while (j < tok.children.length) {
      const chunk = tok.children.slice(j, j + WINDOW_SIZE);
      if (canChunkComposeMentionToken(chunk)) {
        newChildren = newChildren.concat(chunkWithMentionToken(chunk));
        j += WINDOW_SIZE;
      } else {
        newChildren.push(tok.children[j]);
        j++;
      }
    }

    state.tokens[i].children = newChildren;
  }
}

export default function mention(md: MarkdownIt) {
  md.renderer.rules.mention = renderMention;
  md.core.ruler.after("inline", "mention", parseMentions);
}
