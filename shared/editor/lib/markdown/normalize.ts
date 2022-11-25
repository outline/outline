/**
 * Add support for additional syntax that users paste even though it isn't
 * supported by the markdown parser directly by massaging the text content.
 *
 * @param text The incoming pasted plain text
 */
export default function normalizePastedMarkdown(text: string): string {
  const CHECKBOX_REGEX = /^\s?(\[(X|\s|_|-)\]\s(.*)?)/gim;

  // find checkboxes not contained in a list and wrap them in list items
  while (text.match(CHECKBOX_REGEX)) {
    text = text.replace(CHECKBOX_REGEX, (match) => `- ${match.trim()}`);
  }

  // find multiple newlines and insert a hard break to ensure they are respected
  text = text.replace(/\n{3,}/g, "\n\n\\\n");

  // find single newlines and insert an extra to ensure they are treated as paragraphs
  text = text.replace(/\b\n\b/g, "\n\n");

  return text;
}
