/**
 * Add support for additional syntax that users paste even though it isn't
 * supported by the markdown parser directly by massaging the text content.
 *
 * @param text The incoming pasted plain text
 */
export default function normalizePastedMarkdown(text: string): string {
  const CHECKBOX_REGEX = /^\s?(\[(X|\s|_|-)\]\s(.*)?)/gim;
  const CODE_BLOCK_REGEX = /^ {0,3}(`{3,}|~{3,})[\s\S]*?^ {0,3}\1/gm;

  const placeholders: string[] = [];
  const placeholderPrefix = "REPLACED_CODE_BLOCK_";

  // Replace code blocks with placeholders to prevent normalization
  text = text.replace(CODE_BLOCK_REGEX, (match) => {
    const placeholder = `${placeholderPrefix}${placeholders.length}`;
    placeholders.push(match);
    return placeholder;
  });

  // find checkboxes not contained in a list and wrap them in list items
  while (text.match(CHECKBOX_REGEX)) {
    text = text.replace(CHECKBOX_REGEX, (match) => `- ${match.trim()}`);
  }

  // find multiple newlines and insert a hard break to ensure they are respected
  text = text.replace(/\n{3,}/g, "\n\n\\\n");

  // find single newlines and insert an extra to ensure they are treated as paragraphs
  text = text.replace(/\b\n\b/g, "\n\n");

  // Restore placeholders
  placeholders.forEach((match, index) => {
    const placeholder = `${placeholderPrefix}${index}`;
    text = text.replace(placeholder, match);
  });

  return text;
}
