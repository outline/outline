import TurndownService from "turndown";

/**
 * A turndown plugin overriding inbuilt image parsing behavior
 *
 * @param turndownService The TurndownService instance.
 */
export default function images(turndownService: TurndownService) {
  turndownService.addRule("image", {
    filter(node) {
      return node.nodeName === "IMG" && !node?.className.includes("emoticon");
    },
    replacement(content, node) {
      if (!("className" in node)) {
        return content;
      }
      const alt = cleanAttribute(node.getAttribute("alt") || "");
      const src = cleanAttribute(node.getAttribute("src") || "");
      const title = cleanAttribute(node.getAttribute("title") || "");

      // Remove icons in issue keys as they will not resolve correctly and mess
      // up the layout.
      if (
        node.className === "icon" &&
        node.parentElement?.className.includes("jira-issue-key")
      ) {
        return "";
      }

      // Respect embedded Confluence image size
      let size;
      const naturalWidth = node.getAttribute("data-width");
      const naturalHeight = node.getAttribute("data-height");
      const width = node.getAttribute("width");

      if (naturalWidth && naturalHeight && width) {
        const ratio = parseInt(naturalWidth) / parseInt(width);
        size = ` =${width}x${parseInt(naturalHeight) / ratio}`;
      }

      const titlePart = title || size ? ` "${title}${size}"` : "";

      return src ? `![${alt}](${src}${titlePart})` : "";
    },
  });
}

function cleanAttribute(attribute: string) {
  return (attribute ? attribute.replace(/\n+/g, "") : "").trim();
}
