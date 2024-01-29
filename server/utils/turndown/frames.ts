import TurndownService from "turndown";

/**
 * A turndown plugin to convert iframes to markdown links.
 *
 * @param turndownService The TurndownService instance.
 */
export default function images(turndownService: TurndownService) {
  turndownService.addRule("frames", {
    filter: "iframe",
    replacement(content, node: HTMLIFrameElement) {
      const src = (node.getAttribute("src") || "").replace(/\n+/g, "");
      const title = cleanAttribute(node.getAttribute("title") || "");
      return src ? "[" + (title || src) + "]" + "(" + src + ")" : "";
    },
  });
}

function cleanAttribute(attribute: string) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
}
