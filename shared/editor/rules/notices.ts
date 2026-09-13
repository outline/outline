import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import customFence from "markdown-it-container";
import { parseNoticeInfo } from "../lib/notice";

export default function notice(md: MarkdownIt): void {
  return customFence(md, "notice", {
    marker: ":",
    validate: () => true,
    render(tokens: Token[], idx: number) {
      const { info } = tokens[idx];

      if (tokens[idx].nesting === 1) {
        // opening tag
        const { style } = parseNoticeInfo(info);
        return `<div class="notice notice-${md.utils.escapeHtml(style)}">\n`;
      } else {
        // closing tag
        return "</div>\n";
      }
    },
  });
}
