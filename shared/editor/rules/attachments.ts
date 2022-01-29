import MarkdownIt from "markdown-it";
import customFence from "markdown-it-container";
import Token from "markdown-it/lib/token";

export default function attachment(md: MarkdownIt): void {
  return customFence(md, "attachment", {
    marker: "@",
    validate: () => true,
    render: function (tokens: Token[], idx: number) {
      const { info } = tokens[idx];

      if (tokens[idx].nesting === 1) {
        // opening tag
        return `<div class="attachment attachment-${md.utils.escapeHtml(
          info
        )}">\n`;
      } else {
        // closing tag
        return "</div>\n";
      }
    },
  });
}
