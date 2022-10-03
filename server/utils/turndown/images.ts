import TurndownService from "turndown";

/**
 * A turndown plugin overriding inbuilt image parsing behavior
 *
 * @param turndownService The TurndownService instance.
 */
export default function images(turndownService: TurndownService) {
  turndownService.addRule("image", {
    filter: "img",

    replacement(content, node) {
      // @ts-expect-error getAttribute exists
      const alt = cleanAttribute(node.getAttribute("alt"));
      // @ts-expect-error getAttribute exists
      const src = (node.getAttribute("src") || "").replace(/\n+/g, "");
      // @ts-expect-error getAttribute exists
      const title = cleanAttribute(node.getAttribute("title"));
      const titlePart = title ? ' "' + title + '"' : "";
      return src ? "![" + alt + "]" + "(" + src + titlePart + ")" : "";
    },
  });
}

function cleanAttribute(attribute: string) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
}
