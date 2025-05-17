import MarkdownIt from "markdown-it";
import customFence from "markdown-it-container";

export default function toggleBlocks(md: MarkdownIt): void {
  return customFence(md, "toggle_block", {
    marker: "+",
    validate: () => true,
  });
}
