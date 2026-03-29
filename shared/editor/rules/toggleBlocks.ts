import type MarkdownIt from "markdown-it";
import customFence from "markdown-it-container";

export default function toggleBlocks(md: MarkdownIt): void {
  return customFence(md, "toggle", {
    marker: "+",
    validate: () => true,
  });
}
