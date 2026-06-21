import type MarkdownIt from "markdown-it";
import customFence from "markdown-it-container";

/**
 * Markdown-it rules for the side-by-side layout block and its sections.
 *
 * A layout is serialized as nested fenced containers. The outer fence uses four
 * colons so that the inner three-colon section fences do not prematurely close
 * it, for example:
 *
 *   ::::layout
 *   :::layout_section
 *   ![](left.png)
 *   :::
 *   :::layout_section
 *   ![](right.png)
 *   :::
 *   ::::
 *
 * @param md the markdown-it instance to register the rules on.
 */
export default function layouts(md: MarkdownIt): void {
  customFence(md, "layout", { marker: ":" });
  customFence(md, "layout_section", { marker: ":" });
}
