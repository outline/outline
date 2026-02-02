import type TurndownService from "turndown";

/**
 * A turndown plugin to convert iframes to markdown links.
 *
 * @param turndownService The TurndownService instance.
 */
export default function frames(turndownService: TurndownService) {
  turndownService.addRule("frames", {
    filter: "iframe",
    replacement(_content, node: HTMLIFrameElement) {
      const src = (node.getAttribute("src") || "").replace(/\n+/g, "");
      if (!src) {
        return "";
      }

      const dataEmbed = node.getAttribute("data-embed") || "";
      const classList = node.getAttribute("class") || "";
      const isOutlineEmbed =
        classList.split(/\s+/).includes("embed") || dataEmbed === src;

      if (isOutlineEmbed) {
        // Preserve Outline embeds using placeholder syntax so the importer can recreate them
        return `::embed[${src}]::`;
      }

      const title = cleanAttribute(node.getAttribute("title") || "");
      return `[${title || src}](${src})`;
    },
  });
}

function cleanAttribute(attribute: string) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
}
