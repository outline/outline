import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import footnote from "markdown-it-footnote";

/**
 * Returns the label of a footnote token produced by markdown-it-footnote. Inline
 * footnotes (`^[text]`) carry no label, so they fall back to their 1-based index.
 *
 * @param token the `footnote_ref` or `footnote_open` token.
 * @returns the footnote label.
 */
export function footnoteLabel(token: Token): string {
  return token.meta.label ?? String(token.meta.id + 1);
}

/**
 * Adds GitHub Flavored Markdown footnotes, `[^1]` references and `[^1]: text`
 * definitions, to the parser. The back-reference anchors that the plugin
 * appends to each footnote are removed as they are not part of the schema.
 *
 * @param md the markdown-it instance.
 */
export default function footnotes(md: MarkdownIt): void {
  md.use(footnote);

  md.core.ruler.after("footnote_tail", "footnote_anchor", (state) => {
    state.tokens = state.tokens.filter(
      (token) => token.type !== "footnote_anchor"
    );
  });
}
