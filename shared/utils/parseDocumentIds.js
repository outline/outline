// @flow
import { parser } from "rich-markdown-editor";

export default function parseDocumentIds(text: string): string[] {
  const value = parser.parse(text);
  let links = [];

  function findLinks(node) {
    // get text nodes
    if (node.type.name === "text") {
      // get marks for text nodes
      node.marks.forEach(mark => {
        // any of the marks links?
        if (mark.type.name === "link") {
          const { href } = mark.attrs;
          // any of the links to other docs?
          if (href.startsWith("/doc")) {
            const tokens = href.replace(/\/$/, "").split("/");
            const lastToken = tokens[tokens.length - 1];

            // don't return the same link more than once
            if (!links.includes(lastToken)) {
              links.push(lastToken);
            }
          }
        }
      });
    }

    if (!node.content.size) {
      return;
    }

    node.content.descendants(findLinks);
  }

  findLinks(value);
  return links;
}

export function parseDocumentSlugFromUrl(url: string) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return;
  }

  return parsed.pathname.replace(/^\/doc\//, "");
}
