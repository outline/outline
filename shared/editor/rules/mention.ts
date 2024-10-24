import MarkdownIt, { Token, StateCore } from "markdown-it";

function renderMention(tokens: Token[], idx: number) {
  const id = tokens[idx].attrGet("id");
  const mType = tokens[idx].attrGet("type");
  const mId = tokens[idx].attrGet("modelId");
  const label = tokens[idx].content;

  return `<span id="${id}" class="mention" data-type="${mType}" data-id="${mId}">${label}</span>`;
}

function parseMentions(state: StateCore) {
  const hrefRE = /^mention:\/\/([a-z0-9-]+)\/([a-z]+)\/([a-z0-9-]+)$/;

  for (let i = 0; i < state.tokens.length; i++) {
    const tok = state.tokens[i];
    if (!(tok.type === "inline" && tok.children)) {
      continue;
    }

    const canChunkComposeMentionToken = (chunk: Token[]) => {
      // no group of tokens of size less than 4 can compose a mention token
      if (chunk.length < 4) {
        return false;
      }

      const [precToken, openToken, textToken, closeToken] = chunk;

      // check for the valid order of tokens required to compose a mention token
      if (
        !(
          precToken.type === "text" &&
          precToken.content &&
          precToken.content.endsWith("@") &&
          openToken.type === "link_open" &&
          textToken.content &&
          closeToken.type === "link_close"
        )
      ) {
        return false;
      }

      // "link_open" token should have valid href
      const attr = openToken.attrs?.[0];
      if (!(attr && attr[0] === "href" && hrefRE.test(attr[1]))) {
        return false;
      }

      // can probably compose a mention token if arrived here
      return true;
    };

    const chunkWithMentionToken = (chunk: Token[]) => {
      const [precToken, openToken, textToken] = chunk;

      // remove "@" from preceding token
      precToken.content = precToken.content.slice(0, -1);

      // href must be present, otherwise the hrefRE test in canChunkComposeMentionToken would've failed
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const href = openToken.attrs![0][1];
      const matches = href.match(hrefRE);
      const [id, mType, mId] = matches!.slice(1);

      const mentionToken = new state.Token("mention", "", 0);
      mentionToken.attrSet("id", id);
      mentionToken.attrSet("type", mType);
      mentionToken.attrSet("modelId", mId);
      mentionToken.content = textToken.content;

      // "link_open", followed by "text" and "link_close" tokens are coalesced
      // into "mention" token, hence removed
      return [precToken, mentionToken];
    };

    let newChildren: Token[] = [];
    let j = 0;
    while (j < tok.children.length) {
      // attempt to grab next four tokens that could potentially construct a mention token
      const chunk = tok.children.slice(j, j + 4);
      if (canChunkComposeMentionToken(chunk)) {
        newChildren = newChildren.concat(chunkWithMentionToken(chunk));
        // skip by 4 since mention token for this group of tokens has been composed
        // and the group cannot compose mention tokens any further
        j += 4;
      } else {
        // push the tokens which do not participate in composing a mention token as it is
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
