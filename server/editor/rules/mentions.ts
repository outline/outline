import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import { Hook, PluginManager } from "@server/utils/PluginManager";

/**
 * Narrows the generic mentions produced for external links to the resource
 * they point at, by asking each plugin whether it recognizes the URL.
 *
 * @param state the markdown-it parser state.
 */
function resolveMentionTypes(state: StateCore) {
  const providers = PluginManager.getHooks(Hook.MentionProvider);
  if (!providers.length) {
    return;
  }

  for (const token of state.tokens) {
    if (token.type !== "inline" || !token.children) {
      continue;
    }

    for (const child of token.children) {
      const href = child.type === "mention" ? child.attrGet("href") : null;
      if (!href) {
        continue;
      }

      let url: URL;
      try {
        url = new URL(href);
      } catch {
        continue;
      }

      for (const provider of providers) {
        const type = provider.value(url);
        if (type) {
          child.attrSet("type", type);
          break;
        }
      }
    }
  }
}

/**
 * Markdown-it plugin that resolves the type of mentions created from external
 * links. It is only applied to parsers on the server, where the plugins that
 * recognize a URL are registered.
 *
 * @param md the markdown-it instance.
 */
export default function mentions(md: MarkdownIt) {
  md.core.ruler.after("mention", "mention_type", resolveMentionTypes);
}
