import { parser } from "rich-markdown-editor";

export default function parseDocumentIds(text: string): string[] {
  const value = parser.parse(text);
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'links' implicitly has type 'any[]' in so... Remove this comment to see the full error message
  const links = [];

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'node' implicitly has an 'any' type.
  function findLinks(node) {
    // get text nodes
    if (node.type.name === "text") {
      // get marks for text nodes
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'mark' implicitly has an 'any' type.
      node.marks.forEach((mark) => {
        // any of the marks links?
        if (mark.type.name === "link") {
          const { href } = mark.attrs;

          // any of the links to other docs?
          if (href.startsWith("/doc")) {
            const tokens = href.replace(/\/$/, "").split("/");
            const lastToken = tokens[tokens.length - 1];

            // don't return the same link more than once
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'links' implicitly has an 'any[]' type.
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
  // @ts-expect-error ts-migrate(7005) FIXME: Variable 'links' implicitly has an 'any[]' type.
  return links;
}
